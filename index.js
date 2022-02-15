"use strict";

const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const https = require('https');

var waitList;
var concurrent;
var sum;
var cloudFrontIPs;

const newRequest = async(ip) => {
    try {
        const rep = await axios.get(`https://${ip}:443`);
        let server = rep.headers.server;
        console.log(`IP:${ip},Server:${server}`);
        if (server == 'CloudFront') {
            console.log(`%c找到CloudFlont节点:${ip}`, "color: red");
            cloudFrontIPs.push(ip);
        }
    } catch (err) {
        console.log(`ERROR:请求${ip}失败:${err}`);
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
    }).then(() => {
        console.log("完成!");
    }).catch(err => {
        console.error(err);
    })
}


//axios配置
axios.defaults.headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36' };
axios.defaults.timeout = 10000;
axios.defaults.validateStatus = (status) => {
    return true;
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
const maxConcurrency = 500; //最大并发请求

//初始化
fs.readFile(path.join(__dirname, inputFile), { encoding: 'utf8' }).then(string => {
    waitList = string.split('\n');
    sum = waitList.length;
    console.log("开始扫描HTTPS服务器");
    console.log(`最大并发:${maxConcurrency},输出文件:${outputFile}`);
    for (let i = 0; i < maxConcurrency; i++) {
        newRequest(waitList[i]);
        waitList.shift;
    }
})

//定期输出进度
const interval = setInterval(() => {
    console.log(`%c已完成${Math.round((sum - waitList.length) / sum)}%,共发现${cloudFrontIPs}个CloudFront节点`, 'color: blue');
}, 10000);