"use strict";

const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const https = require('https');

var waitList = [];
var concurrent = 0;
var errors = 0;
var sum;
var cloudFrontIPs = [];
var logHandle;

const newRequest = async(ip) => {
    try {
        const rep = await axios.head(`https://${ip}:443`);
        let server = rep.headers.server;
        logHandle.write(`IP:${ip},Server:${server}`);
        if (server == 'CloudFront') {
            console.log(`找到CloudFlont节点:${ip}`);
            cloudFrontIPs.push(ip);
        }
    } catch (err) {
        ++errors;
        --concurrent;
        logHandle.write(`ERROR:请求${ip}失败:${err}`);
        if (!!waitList) {
            newRequest(waitList[0]);
            waitList.shift();
        } else if (!!concurrent) {
            writeResult();
        }
    }
}

const writeResult = () => {
    //结束进度输出
    clearInterval(interval);
    console.log('扫描完成');
    //将结果写入文件
    fs.open(path.join(__dirname, outputFile), 'w').then(async handle => {
        for (let ip of cloudFrontIPs) {
            await handle.write(`${ip}\n`);
        }
        return handle;
    }).then(() => {
        handle.close();
        logHandle.close();
    }).then(() => {
        console.log("完成!");
    }).catch(err => {
        console.error(err);
    })
}


//axios配置
axios.defaults.headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36' };
axios.defaults.timeout = timeOut;
axios.defaults.validateStatus = (status) => {
    return status >= 200 && status <= 503;
}
axios.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false
})
axios.interceptors.request.use(config => {
    ++concurrent;
    return config;
})
axios.interceptors.response.use(config => {
    --concurrent;
    if (!!waitList) {
        newRequest(waitList[0]);
        waitList.shift();
    } else if (!!concurrent) {
        writeResult();
    }
    return config;
})

//配置
const inputFile = 'ip_webserver.txt'; //输入的文件
const outputFile = 'output.txt'; //输出文件
const logFile = 'scan.log' //日志文件
const timeOut = 10000; //连接超时时间(ms)
const maxConcurrency = 1000; //最大并发请求

//初始化
fs.readFile(path.join(__dirname, inputFile), { encoding: 'utf8' }).then(async string => {
    waitList = string.split('\n');
    sum = waitList.length;
    console.log("初始化日志文件句柄");
    logHandle = await fs.open(path.join(__dirname, logFile), 'w');
    console.log("开始扫描HTTPS服务器");
    console.log(`最大并发:${maxConcurrency},输出文件:${outputFile}\n`);
    for (let i = 0; i < maxConcurrency; i++) {
        newRequest(waitList[i]);
        waitList.shift;
    }
})

//定期输出进度
const interval = setInterval(() => {
    let requestd = sum - waitList.length;
    console.log(`共发送${requestd}个请求,占总数的${Math.round((requestd) / sum * 100) / 100}%,其中${errors}个请求失败,${concurrent}个请求正在进行;\n共发现${cloudFrontIPs.length}个CloudFront节点.`);
}, 10000);