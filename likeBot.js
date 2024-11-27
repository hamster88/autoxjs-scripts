auto();
setScreenMetrics(1080, 1920);

const likeDelay = 100;
const waitLikeUpdateDelay = 100;
const maxLikeRetry = 15;
const targetApp = "com.mihoyo.hyperion";
const activityProfile = "com.mihoyo.hyperion.user_profile.UserProfileActivity";
const activityPost = "com.mihoyo.hyperion.post.detail.PostDetailActivity";
const state = {
  //Package: '',
  //Activity: '',
  Time: "",
  Menory: "",
  user: "",
  start_time: new Date(),
  total: 0,
  plus: 0,
  rep: 0,
  skip: 0,
  retrys: Array(15).fill(-1),
  item_count: 0,
};

_init_state = Object.assign({}, state);
function resetState() {
  state = Object.assign({}, _init_state);
  state.start_time = new Date();
  state.retrys = Array(15).fill(-1);
}

function isTargetApp() {
  return currentPackage() == targetApp;
}

function printObj(obj) {
  console.log(typeof obj);
  for (var item in Object.entries(obj)) {
    var key = item[0];
    var value = item[1];
    console.log(`Key: ${key}, Value: ${value}, Type: ${typeof value}`);
  }
}

function getLikeCount(likeBtn) {
  var n = 0;
  try {
    likeBtn.children().forEach(function (ui) {
      if (ui.className() == "android.widget.TextView") {
        n = ui.text();
        //console.log('喵喵喵', n);
      }
    });
    n = parseInt(n);
    n = isNaN(n) ? 0 : n;
  } catch (e) {
    //log(e)
  }

  return n;
}

function getPostItems() {
  var ui = className("androidx.recyclerview.widget.RecyclerView");
  var child = ui.depth(18).findOne().children();
  var views = [];
  for (var i = 0; i < child.length; i++) {
    var v = child[i];
    if (v != null && v.className() == "android.widget.LinearLayout") {
      views.push(v);
    }
  }

  return views;
}

function doLike(likeBtn, n_retry) {
  if (likeBtn == null) return;

  n_retry = n_retry || 0;
  sleep(likeDelay);
  var n = getLikeCount(likeBtn);
  likeBtn.click();
  sleep(waitLikeUpdateDelay);
  var m = getLikeCount(likeBtn);
  if (m - n == 0 && n_retry <= maxLikeRetry) {
    // 没有变化，可能触发速率限制
    doLike(likeBtn, ++n_retry);
  } else if (m - n < 0 && n_retry <= maxLikeRetry) {
    // 减少，可能是以前赞过，现在被撤销了
    doLike(likeBtn, ++n_retry);
    state.rep++;
  } else if (n_retry <= maxLikeRetry) {
    // 预期正常结果
    state.total += m;
    state.plus++;
    state.retrys.unshift(n_retry);
    state.retrys.pop();
  } else {
    // 重试多次都无法完成
    state.total += m;
    state.skip++;
    state.retrys.unshift(n_retry);
    state.retrys.pop();
  }

  //console.log(n,m,likeBtn,n_retry);
}

function doScrolling(t) {
  t = t || 50
  //var ui = className("androidx.viewpager.widget.ViewPager")
  //.depth("19")
  //.findOne()

  //ui.scrollLeft()

  swipe(500, 1800, 500, 500, t);
  sleep(50);
  swipe(500, 1800, 500, 1775, t);
}

function checkEnd() {
  //id("nickNameTextView")
  theEnd = idEndsWith("endImage").findOnce();
  if (theEnd != null) {
    state.bye = "点赞结束了喵";
    return true;
  }

  emptyList = idEndsWith("mCommonPageStatusViewTvEmpty").findOnce();
  //id("mCommonPageStatusViewIvImage").findOnce();
  if (emptyList != null) {
    state.bye = "看不到你的帖子喵\t"; //emptyList.text()
    return true;
  }

  if (
    className("android.widget.TextView")
      .text("由于用户隐私设置，无法查看\t")
      .exists()
  ) {
    state.bye = "你都把门关上了，我进不来喵\t";
    return true;
  }

  let retryLimit = false;
  let lt5 = 0;
  for (let i of state.retrys) {
    if (i <= 0) {
      retryLimit = false;
      break;
    }

    retryLimit = true;

    // 用于推测具体重试原因
    if (i <= 5) {
      lt5++;
    }
  }

  if (retryLimit) {
    if (lt5 < state.rep) {
      // 重试次数低 且 不够重复点赞数
      state.bye = "网络似乎不太稳定喵\t";
    } else if (lt5 >= state.rep) {
      state.bye = "似乎大部分都赞过了喵\t";
    } else {
      state.bye = "在点赞的路上遇到深渊侵蚀喵喵喵\t";
    }

    //state.bye = 'limit'
    return true;
  }

  return false;
}

function checkEmpty() {
  emptyList = idEndsWith("mCommonPageStatusViewTvEmpty").findOnce();
  //id("mCommonPageStatusViewIvImage").findOnce();
  if (emptyList != null) {
    state.bye = "看不到你的帖子喵\t"; //emptyList.text()
    return state.bye
  }

  if (
    className("android.widget.TextView")
      .text("由于用户隐私设置，无法查看")
      .exists()
  ) {
    state.bye = "你把门关上了，我进不来喵\t";
    return state.bye;
  }
}

function afterEndLike(posts) {
  let end_time = new Date();
  let attr = {
    user: state.user,
    plus: state.plus,
    total: state.total,
    rep: state.rep,
    skip: state.skip,
    bye: state.bye || "执行结束",
    msg: "",
    start_time: state.start_time.toISOString(),
    end_time: end_time.toISOString(),
    used_seconds: (end_time.getTime() - state.start_time.getTime()) / 1000,
    posts: posts,
  };

  let msg = util.format(
    "%s，检索到%d条帖子，点赞了%d次，用时%d秒，帖子总获赞%d，完成时间 %s",
    attr.bye,
    posts.length,
    attr.plus - attr.rep,
    Math.floor(attr.used_seconds),
    attr.total,
    fmt(end_time),
  );

  attr.msg = msg;

  let fp =
    "/storage/emulated/0/Documents/likebot/" +
    attr.end_time.replace(/:/g, "").replace(/[\.\+Z].*/i, "") +
    ".json";
  try {
    let text = JSON.stringify(attr, null, 2);
    files.createWithDirs(fp);
    files.write(fp, text, (encoding = "utf-8"));
    console.log("已写入文件", fp);
  } catch (e) {
    console.error(e);
  }

  return msg;
}

// 脚本主函数
function main() {
  for (let i = 0; i <= 10; i++) {
    let ac = currentActivity();
    if (ac == activityProfile) {
      let msg = likeMain();
      console.log(state.user);
      console.log(msg);
      return;
    }

    if (ac == activityPost) {
      for (;;) {
        let msg = browserCommentMain();
        console.log("评论阅读结束", msg);
        idEndsWith("commentSortHotTv").findOne().click();
        state.user = "(正在等待新评论)";
        sleep(10000);
      }
      return;
    }

    coconso.log("未等到目标Activity", ac);
    sleep(200);
  }
}

function reply(ui, text) {
  let btnId = idEndsWith("mCommentViewCommentLl");
  let editId = idEndsWith("replyEditText");
  let postId = idEndsWith("mSimpleReplyPageTvPost");

  let btn = null;
  while (!btn) {
    btn = ui.findOne(btnId);
  }
  btn.click();

  editId.findOne().setText(text);
  postId.findOne().click();
}

// 浏览主贴评论主函数
function browserCommentMain() {
  idEndsWith("commentSortOldestTv").findOne().click();
  sleep(2000);
  let msg = "";
  let currentKey = ""
  for (var li = 10; li > 0; ) { 
    // 此层循环负责滚动评论区

    
    let commentFrames = depth("13")
      .className("android.widget.FrameLayout")
      .untilFind();

    state.user = "(正在读取评论)";
    state.item_count = commentFrames.length;
    var someKeys = "\n";

    for(let frame of commentFrames){
      let tvs = frame.find(className("android.widget.TextView"));
      let texts = [];
      for (var tv of tvs) {
        texts.push(tv.text());
      }

      let k1 = texts.slice(0, 3);
      let k2 = texts.slice(-2);
      let key = k1.concat(k2).join("\t");
      if (!key.trim() || key.indexOf('回复')==-1) {
        // 排除不是预期的控件
        continue;
      }


      if (currentKey == "") {
        msg = "正在探路中喵"
        if (!(texts.join("\t").match(/\t祈羽夜鸢/))) {
          currentKey = key;
          console.log('key', key);
          reply(frame, "要开始了喵～");

          let entryBtn = null;
          while (!entryBtn) {
            entryBtn = frame.findOne(idEndsWith("mCommentViewNameTv"));
          }
          // currentEntry = entryBtn.text();

          entryBtn.click();
          sleep(2000);

          msg = likeMain()
          //let msg = "还在探路中喵";
          idEndsWith("backButton").findOne().click();
          state.user = "(已完成点赞，回去报告结果)"
          sleep(5000);

          someKeys += truncateString(key, 20) + "\n";
          break; // 返回后原来的控制引用已失效，退出以重新建立引用
        } else {
          someKeys += "*" + truncateString(key, 20) + "\n";
        }
      } else if (currentKey == key) {
        // 点完赞后返回的主贴界面
        reply(frame, msg.replace(/\t.*/,''));
        sleep(10000);
        currentKey = ""
      }
    }
    state.item_keys = someKeys;
    UpdateDynamicText();
    if(!currentKey){
      doScrolling();
    }
    
    if (idEndsWith("endImage").findOnce()) {
      li--;
    }
  }

  return;
}

// 点赞主函数
function likeMain() {
  resetState();
  let nickName = idEndsWith("nickNameTextView").findOnce();
  if (nickName) {
    state.user = nickName.text();
  }

  let isEmptyList = checkEmpty()
  if(isEmptyList){
    return isEmptyList
  }

  var posts = []; // 记录帖子列表
  var doneKeys = new Set(); // 记录已完成的帖子的hash
  for (let li = 2; li > 0; ) {
    //if(!isTargetApp()) continue;

    var somePostItems = getPostItems();
    state.item_count = somePostItems.length;
    var someKeys = "\n";
    var someLikeBtns = []; // 弃用
    for (let i of somePostItems) {
      let texts = [];
      let layouts = i.find(className("android.widget.LinearLayout"));
      let likeBtn = null;
      for (let lv of layouts) {
        //console.log(lv.id());
        if (String(lv.id()).endsWith("instantLikeBtn")) {
          likeBtn = lv;
        }
      }

      let tvs = i.find(className("android.widget.TextView"));
      for (var tv of tvs) {
        texts.push(tv.text());
      }

      var key = postHash(texts);
      if (!doneKeys.has(key)) {
        // 开始对新检索到的帖子点赞

        doLike(likeBtn);
        posts.push(texts);
        doneKeys.add(key);
        someKeys += truncateString(key, 10) + "\n";
      } else {
        someKeys += "*" + truncateString(key, 10) + "\n";
      }
    }
    state.item_keys = someKeys;

    UpdateDynamicText();
    doScrolling();
    //sleep(1000)

    if (checkEnd()) {
      li--;
    }
  }

  return afterEndLike(posts);
}

function postHash(texts) {
  var hash = texts.slice(0, -1).join("\t");
  return hash;
}

var window = floaty.rawWindow(
  <frame gravity="center" bg="#7F1E2F65">
    <text id="text" textSize="16sp" textColor="#ffffff" />
  </frame>,
);

window.setTouchable(false);
window.exitOnClose();

function UpdateDynamicText() {
  ui.run(function () {
    window.text.setText(dynamicText());
  });
}

function dynamicText() {
  var date = new Date();
  var str = "";
  //str += util.format("内存使用量: %d%%\n", getMemoryUsage());
  //str += "当前活动: " + currentActivity() + "\n";
  //str += "当前包名: " + currentPackage() + '\n';

  //state.Package = currentPackage()
  //state.Activity = currentActivity()
  state.Menory = getMemoryUsage() + "%";
  state.Time = date;

  for (var k in state) {
    var v = state[k];
    str += k + ": " + fmt(v) + "\n";
  }
  return str;
}

//获取内存使用率
function getMemoryUsage() {
  var usage = (100 * device.getAvailMem()) / device.getTotalMem();
  //保留一位小数
  return Math.round(usage * 10) / 10;
}

function fmt(val) {
  var str = val;
  if (val instanceof Date)
    str = [
      String(val.getHours()).padStart(2, "0"),
      String(val.getMinutes()).padStart(2, "0"),
      String(val.getSeconds()).padStart(2, "0"),
    ].join(":");
  return str;
}

function truncateString(str, length) {
  if (str.length > length) {
    return str.substring(0, length) + "...";
  }
  return str;
}

try {
  main();
} catch (e) {
  state.bye = "出错了喵";
  //afterEndLike()
  toast(e + "");
  console.error(e);
}
