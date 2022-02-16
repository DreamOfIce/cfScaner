"use strict";

const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const https = require('https');


//配置
const inputFile = 'ip_webserver.txt'; //输入的文件
const outputFile = 'result.txt'; //输出文件
const logFile = 'scan.log' //日志文件
const timeOut = 15000; //连接超时时间(ms)
const maxConcurrency = 800; //最大并发请求


var waitList = [];
var concurrent = 0;
var errors = 0;
var sum;
var cloudFrontIPSum = 0;
var outputHandle;
var logHandle;

const newRequest = async(ipAddress) => {
    let ip = ipAddress.trim();
    try {
        let rep = await axios.head(`https://${ip}:443`);
        let server = rep.headers.server;
        logHandle.write(`IP:${ip},Server:${server}\n`);
        if (server == 'CloudFront') {
            console.log(`找到CloudFlont节点:${ip}`);
            outputHandle.write(`${ip}\n`);
            cloudFrontIPSum++;
        }
    } catch (err) {
        errors++;
        logHandle.write(`[ERROR] IP:${ip}:${err}.\n`);
    } finally {
        concurrent--;
        if (waitList.length != 0) {
            newRequest(waitList.shift());
        } else if (concurrent == 0) {
            console.log("扫描结束");
            writeResult();
        }
    }
}

const writeResult = () => {
    //结束进度输出
    clearInterval(interval);
    //关闭文件句柄
    outputHandle.close();
    logHandle.close();
    console.log("完成!");
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
    concurrent++;
    return config;
})

//初始化
fs.readFile(path.join(__dirname, inputFile), { encoding: 'utf8' }).then(async string => {
    waitList = string.split('\n');
    sum = waitList.length;
    //输出信息
    console.log("CloudFront Scaner");
    console.log(`输入文件:${inputFile},输出文件:${outputFile},日志文件${logFile}`);
    console.log(`最大并发:${maxConcurrency},连接超时:${timeOut}\n`);
    console.log("初始化输出文件句柄");
    outputHandle = await fs.open(path.join(__dirname, outputFile), 'w');
    console.log("完成");
    console.log("初始化日志文件句柄");
    logHandle = await fs.open(path.join(__dirname, logFile), 'w');
    console.log("完成");
    console.log(`开始扫描${sum}个HTTPS服务器`);
    //开始请求
    for (let i = 0; i < maxConcurrency && i < sum; i++) {
        newRequest(waitList.shift());
    }
})

//定期输出进度
const interval = setInterval(() => {
    let requestd = sum - waitList.length;
    console.log(`共发送${requestd}个请求,占总数的${Math.round(requestd / sum * 100)}%,其中${errors}个请求失败,${concurrent}个请求正在进行;\n已发现${cloudFrontIPSum}个CloudFront节点.`);
}, 10000);