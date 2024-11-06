const axios = require('axios')
const vscode = require('vscode')
const md5 = require('md5')
const appid = vscode.workspace.getConfiguration().get('translate.appid')
const secret = vscode.workspace.getConfiguration().get('translate.secret')

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
