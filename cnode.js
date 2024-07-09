
const fs = require('fs')
const path = require('path')
const { exec } = require("child_process");

const exclude = /\.git/
const _PATH = __dirname + path.sep
const argvObj = getArgs()
const argv = Object.keys(argvObj).map(key => {
    const num = Number(key)
    if (!isNaN(num)) {
        return argvObj[key]
    }
    return undefined
}).filter(arg => arg)

if (!fs.existsSync(_PATH + 'src')) {
    fs.mkdirSync(_PATH + 'src')
}

let env = 'dev'
const envList = ['dev', 'pro', 'test']
const exportDir = _PATH + 'src'
deleteSrc(exportDir)
const mainDir = _PATH + 'src-main'
const mainFiles = listFile(mainDir, mainDir)


// 加载需要混入的路径列表
const loadDirs = {
}
{
    const args = readCnode(argv)
    console.log(args)
    const argvL = Object.keys(args).length
    for (let i = 2; i < argvL; i++) {
        if (argvL - 1 === i && envList.includes(args[i])) {
            env = args[i]
        }
        else {
            const dirPath = _PATH + 'src-' + args[i]
            loadDirs[dirPath] = listFile(dirPath, mainDir, dirPath).map(item => item.match(/[\/\\]src\-.+?([\\\/].*)/)[1])
        }
    }
}

const loadDirKeys = Object.keys(loadDirs)

// 整理出所有文件列表
const allFiles = loadDirKeys.flatMap(key => {
    return loadDirs[key].map(item => ({
        path: item,
        fullpath: key + item
    }))
}).concat(mainFiles.map(item => {
    const path = item.match(/[\/\\]src\-.+?([\/\\].*)/)[1]
    let result = {
        path,
        fullpath: item
    }

    loadDirKeys.forEach(key => {
        let newPath = path
        // 不同环境下的文件查找
        const envPath = path.replace(/(\..*?)$/, `.${env}$1`)
        const envIndex = loadDirs[key].indexOf(envPath)
        if (envIndex !== -1) {
            newPath = envPath
        }

        // 追加文件查找
        const pushPath = newPath.replace(/(\..*?)$/, '@push$1')
        const pushIndex = loadDirs[key].indexOf(pushPath)

        // 默认文件寻找
        const index = loadDirs[key].indexOf(newPath)

        if (index === -1 && pushIndex === -1) {
            return
        }
        else if (index !== -1) {
            result = {
                key,
                index,
                path,
                fullpath: key + newPath,
                mainPath: item
            }
        } else {
            result = {
                key,
                index,
                path,
                fullpath: item,
                pushPath: key + pushPath
            }
        }
    })

    // 去掉重复项
    if (result.key) {
        loadDirs[result.key].splice(result.index, 1)
    }
    return result
}))

// 获取url参数
function getArgs() {
    const result = {}
    process.argv.forEach((val, index) => {
        const match = val.match(/^--(.*?)=(.*?)$/)
        if (match) {
            result[match[1]] = match[2]
        }
        else {
            result[index] = val
        }
    })
    return result
}

function readCnode(argv) {
    let args = argv
    let argvL = Object.keys(argv).length
    // 只有一个参数时，读取目录下是否存在.cnode文件
    if (argvL === 3) {
        const argPath = _PATH + 'src-' + argv[2]
        const cnodeFile = argPath + path.sep + '.cnode'
        if (fs.existsSync(cnodeFile)) {
            const str = fs.readFileSync(cnodeFile, 'utf8')
            args = {
                '0': argv[0],
                '1': argv[1],
            }
            str.split(/\r\n|\r|\n/).filter((arg, index) => {
                if (index === 0 && arg === 'main') {
                    return false
                }
                return true
            }).map((arg, index) => {
                args[index + 2] = arg
            })
            argvL = Object.keys(args).length
        }
    }
    return args
}

function listFile(dir, mainDir, loadDir = null) {
    const list = []
    const arr = fs.readdirSync(dir)
    arr.forEach(item => {
        const fullpath = path.join(dir, item)
        const stats = fs.statSync(fullpath)
        const newDir = dir.replace(mainDir, exportDir).replace(loadDir, exportDir)
        // 若导出文件夹不存在则创建文件夹
        if (!fs.existsSync(newDir)) {
            fs.mkdirSync(newDir)
        }
        if (stats.isDirectory()) {
            // 如果遍历到文件夹则遍历该文件夹
            list.push(...listFile(fullpath, mainDir, loadDir).filter(path => !exclude.test(path)))
        } else {
            list.push(fullpath)
        }
    })
    return list
}


// pages.json文件处理
function pagesHandle(filePath, exportPath) {
    const data = JSON.parse(fs.readFileSync(filePath.mainPath, 'utf8'))
    const data2 = JSON.parse(fs.readFileSync(filePath.fullpath, 'utf8'))
    if (!data2.pages || !data2.pages.length) {
        return
    }
    const pages = data2.pages.map(item => item.path)
    data2.pages.unshift(...data.pages.filter(item => !pages.includes(item.path)))
    data.pages = data2.pages
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 4))
}


// json文件处理
function jsonHandle(filePath, exportPath) {
    const data1 = JSON.parse(fs.readFileSync(filePath.mainPath, 'utf8'))
    const data2 = JSON.parse(fs.readFileSync(filePath.fullpath, 'utf8'))
    const data = Object.assign(data1, data2)
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 4))
}

// 追加处理
function pushHandle(filePath, exportPath) {
    const data1 = fs.readFileSync(filePath.fullpath, 'utf8')
    const data2 = fs.readFileSync(filePath.pushPath, 'utf8')
    fs.writeFileSync(exportPath, data1 + '\r\n' + data2)
}

// 文件处理
function fileHandle(filePath) {
    const exportPath = exportDir + filePath.path
    // console.log(filePath)
    // console.log(exportPath)

    // 出现重复文件处理
    if (filePath.mainPath) {
        // pages.json处理
        if (/pages\.json$/.test(filePath.mainPath)) {
            pagesHandle(filePath, exportPath)
            return
        }
        // json文件处理
        if (/\.json$/.test(filePath.mainPath)) {
            jsonHandle(filePath, exportPath)
            return
        }
    }

    // 追加文件处理
    if (filePath.pushPath) {
        pushHandle(filePath, exportPath)
        return
    }

    // 默认直接拷贝覆盖
    fs.copyFile(filePath.fullpath, exportPath, () => {
    })
}

// 删除src文件夹
function deleteSrc(file_path) {
    const files = fs.readdirSync(file_path)
    files.forEach(file => {
        const filePath = `${file_path}${path.sep}${file}`
        const stats = fs.statSync(filePath)
        if (stats.isDirectory()) {
            deleteSrc(filePath)
            fs.rmdirSync(filePath)
        } else {
            fs.unlinkSync(filePath)
        }
    })
}

function format() {
    // console.log(allFiles)
    allFiles.forEach(item => {
        fileHandle(item)
    })
}

// 监听文件更改并实施更新
function watch() {
    allFiles.forEach(item => {
        fs.watchFile(item.fullpath, () => {
            fileHandle(item)
        })
    })
}


format()
// getBuildConfig()
if (argvObj.mode !== 'serve') {
    watch()
    const ex = exec('npm run dev')
    ex.stdout.on('data', function (data) {
        console.log(data)
    })
    console.log('\r\n服务启动中...')
}
