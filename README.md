# CloudFront Scaner

扫描Cloudfront在国内的节点,可以拿来做免BA的CDN.

> *   相关思路来源于网络;
>
> *   本方法公开后,有可能什么时候官方堵住了这个漏洞.因此建议不要随意用在生产环境;
>
> *   请遵守相关国家法律法规及服务商政策,使用本项目带来的一切后果由使用人承担.

# 运行

```shell
chmod +x run.sh && ./run.sh
```

# 注意事项

1.  仅适用于`Debian`系Linux,当然,你可以把`apt`替换成`yum`以在`RedHat`系Linux上使用;

2.  建议使用外国大带宽服务器运行,否则容易被封IP;

3.  运行时间因带宽和延迟而定,可能持续数小时,墙裂推荐使用`screen`运行:

    *   安装screen并运行

    ```shell
        apt update
        apt install screen
        screen -S cfscaner
        chmod +x run.sh && ./run.sh
    ```

    *   使用以下命令来返回会话:

    ```shell
    screen -r cfscaner
    ```

4.  请根据服务器配置自行更改并发数和带宽,建议最多占用50%左右;

# 配置

*   Zmap扫描带宽:
    [run.sh](./run.sh)第8行,参数`-B=500M`指定带宽(K/M/G);

*   HEAD请求并发数:
    [index.js](./index.js)第71行

# LICENSE

MIT
