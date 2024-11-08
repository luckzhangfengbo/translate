const vscode = require("vscode");
const api = require("./translate-api");

/**
 * 处理异常
 */
function handlingExceptions(code) {
  const codes = {
    52001: "请求超时,检查网络后重试",
    52002: "系统错误, 查看百度翻译官网公告",
    52003: "请检查appid或者服务是否开通",
    54000: "必填参数为空",
    54001: " 签名错误",
    54003: "访问频率受限",
    54004: "账户余额不足 ",
    54005: "长query请求频繁, 请降低长query的发送频率，3s后再试 ",
    58000: "客户端IP非法",
    58001: "语言不支持",
    58002: "服务当前已关闭, 请前往管理控制台开启服务",
    90107: "认证未通过或未生效",
  };
  vscode.window.showWarningMessage(
    "translate@sunkaisens: " + (codes[code] || "未知异常, 可评论反馈")
  );
}

/**
 * 存储翻译历史记录，并删除过期的记录（超过一天的）
 * @param {vscode.ExtensionContext} context
 * @param {string} originalText 原文本
 * @param {string} translatedText 翻译后的文本
 */
function saveTranslationHistory(context, originalText, translatedText) {
  const history = context.globalState.get("translationHistory", []);

  // 删除超过一天的历史记录
  const oneDayInMillis = 24 * 60 * 60 * 1000;
  const currentTime = new Date().getTime();
  const filteredHistory = history.filter(record => {
    return (currentTime - new Date(record.date).getTime()) < oneDayInMillis;
  });

  // 添加新的记录
  filteredHistory.push({ originalText, translatedText, date: new Date().toLocaleString() });

  // 更新保存的历史记录
  context.globalState.update("translationHistory", filteredHistory);
}


/**
 * 查看翻译历史并支持多选， 不分页
 * @param {vscode.ExtensionContext} context
 */
async function viewTranslationHistory(context) {
  const history = context.globalState.get("translationHistory", []);
  if (history.length === 0) {
    vscode.window.showInformationMessage("没有翻译历史记录。");
    return;
  }

  const items = history.map((record, index) => ({
    label: `#${index + 1} - ${record.date}`,
    description: `原文: ${record.originalText}`,
    detail: `译文: ${record.translatedText}`,  // 译文前缀
    originalText: record.originalText,
    translatedText: record.translatedText,
    date: record.date
  }));

  // 允许多选并启用模糊搜索
  const selections = await vscode.window.showQuickPick(items, {
    placeHolder: "请选择翻译记录进行查看",
    canPickMany: true, // 允许多选
    matchOnDetail: true, // 启用模糊搜索
    matchOnDescription: true, // 允许根据 description 模糊匹配
    matchOnLabel: true // 允许根据 label 模糊匹配
  });

  if (selections && selections.length > 0) {
    // 将所有选中的翻译内容复制到剪贴板，去除“译文:”
    const copiedText = selections
      .map(selection => selection.detail.replace(/^译文:\s*/, '')) // 删除“译文:”前缀
      .join("\n\n");

    vscode.env.clipboard.writeText(copiedText);
    vscode.window.showInformationMessage(`${selections.length} 条翻译记录的译文已复制到剪贴板。`);
  }
}



/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    // 检查是否是首次安装
    const isFirstRun = context.globalState.get("isFirstRun", true);

    if (isFirstRun) {
      // 清除历史记录
      context.globalState.update("translationHistory", []);
      
      // 设置标记为 false，表示已经执行过清除操作
      context.globalState.update("isFirstRun", false);
    }
  const disposableTranslate = vscode.commands.registerCommand(
    "translate.zntoen",
    async function () {
      /**
       * @type {string} 选择的单词
       */
      let selectWord;
      const currentEditor = vscode.window.activeTextEditor; //获取当前活动的文本编辑器
      if (!currentEditor) return;
      const currentSelect = currentEditor.document.getText(
        currentEditor.selection
      );
      if (!currentSelect) return;
      /**
       * 使用 api.translate 函数将选中的中文文本翻译成英文。
          如果返回的数据中包含错误代码，则调用 handlingExceptions 函数处理异常
       */
      const data = await api.translate(currentSelect, "zh", "en"); 

      if (data.data.error_code) {
        handlingExceptions(data.data.error_code);
        return;
      }

      const result = data.data.trans_result[0].dst;
      // 基于空格分割
      const list = result.split(" ");
      if (list.length > 1) {
        const arr = [];
        // 小驼峰
        arr.push(
          list
            .map((v, i) => {
              if (i !== 0) {
                return v.charAt(0).toLocaleUpperCase() + v.slice(1);
              }
              return v.toLocaleLowerCase();
            })
            .join("")
        );
        // - 号连接
        arr.push(list.map((v) => v.toLocaleLowerCase()).join("-"));
        // 下划线连接
        arr.push(list.map((v) => v.toLocaleLowerCase()).join("_"));
        // 大驼峰
        arr.push(
          list.map((v) => v.charAt(0).toLocaleUpperCase() + v.slice(1)).join("")
        );
        selectWord = await vscode.window.showQuickPick(arr, {
          placeHolder: "请选择要替换的变量名",
        });
      } else {
        selectWord = list[0];
      }

      if (selectWord) {
        currentEditor.edit((editBuilder) => {
          editBuilder.replace(currentEditor.selection, selectWord);
        });
        // 保存翻译历史记录
        saveTranslationHistory(context, currentSelect, selectWord);
      }
    }
  );

  const disposablePrint = vscode.commands.registerCommand(
    "translate.print",
    async function () {
      const currentEditor = vscode.window.activeTextEditor;
      if (!currentEditor) return;

      const selectedText = currentEditor.document.getText(currentEditor.selection);
      if (!selectedText) return;

      const data = await api.translate(selectedText, "zh", "en");

      if (data.data.error_code) {
        handlingExceptions(data.data.error_code);
        return;
      }

      const translatedText = data.data.trans_result[0].dst;
      saveTranslationHistory(context, selectedText, translatedText);

      currentEditor.edit((editBuilder) => {
        editBuilder.replace(currentEditor.selection, translatedText);
      });
    }
  );

  const disposableViewHistory = vscode.commands.registerCommand(
    "translate.viewHistory",
    () => viewTranslationHistory(context)
  );

  context.subscriptions.push(disposableTranslate, disposablePrint, disposableViewHistory);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};