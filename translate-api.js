const axios = require('axios')
const vscode = require('vscode')
const md5 = require('md5')
// const appid = vscode.workspace.getConfiguration().get('translate.appid')
// const secret = vscode.workspace.getConfiguration().get('translate.secret')

// 提供默认的 appid 和 secret，如果没有在设置中配置，会使用这些默认值
const defaultAppid = '20251019002179935'; // 替换成你的默认 appid
const defaultSecret = 'agD30Rc3uhdhaDOrLiea'; // 替换成你的默认 secret
// 优先从用户配置获取 appid 和 secret，若未设置则使用默认值
const appid = vscode.workspace.getConfiguration().get('translate-sunkaisens.appid') || process.env.BAIDU_TRANSLATE_APPID || defaultAppid;
const secret = vscode.workspace.getConfiguration().get('translate-sunkaisens.secret') || process.env.BAIDU_TRANSLATE_SECRET || defaultSecret;
module.exports = {
  /**
   * 翻译方法
   * @param {string} q 查询字符串
   * @param {string} from 源语言
   * @param {string} to 目标语言
  * @returns {
    Promise<{
    data: {
    trans_result: [{
      src: string, dst: string
    }]
  }
}>} Promise翻译结果
   */
  translate(q, from, to) {
    var salt = Math.random()
    return axios({
      method: 'get',
      url: 'https://fanyi-api.baidu.com/api/trans/vip/translate',
      params: {
        q,
        appid,
        from,
        to,
        salt,
        sign: md5(appid + q + salt + secret)
      }
    })
  }
}
