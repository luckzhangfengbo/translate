// function.js

/**
 * 检查文本是否包含中文字符
 * @param {string} text
 * @returns {boolean} 是否包含中文字符
 */
function isChinese(text) {
    return /[\u4e00-\u9fa5]/.test(text);
}
  
module.exports = { isChinese };
  