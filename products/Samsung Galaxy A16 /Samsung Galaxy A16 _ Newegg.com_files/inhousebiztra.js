var inhouseBiztra = {
  //remove the un-useful variables
  blacklist: [
    "vl_l",
    "vl_m",
    "vl_mr",
    "vl_t",
    "vl_l2",
    "vl_g",
    "linkdownloadfiletypes",
    "linkinternalfilters",
    "selist",
    "m_media_c",
    "tagcontainermarker",
    "_in",
    "_c",
    "ba",
    "ea",
    "la",
    "__ccucr",
    "__ccucw",
    "na",
    "ra",
    "fb",
    "q",
    "aa",
    "ka",
    "kb",
    "ob",
    "ib",
    "$a",
    "bc",
    "ia",
    "ja",
    "javaenabled",
    "javascriptversion",
    "ma",
    "colordepth",
    "maxdelay",
    "ssl",
    "ta",
    "trackdownloadlinks",
    "trackexternallinks",
    "trackinlinestats",
    "ua",
    "useforcedlinktracking",
    "useplugins",
    "version",
    "firedplugins",
    "audiencemanagerblob",
    "audiencemanagerlocationhint",
    "cookiesenabled",
    "offlinefilename",
  ],
  //whitelist  make sure every single call contains these parameters
  whitelist: ["prop19", "evar15"],
  //build img tag
  buildImg: function (params) {
    //service
    var url = "https://pf.newegg.com/p.gif";
    var url_post = "https://pf.newegg.com/p";

    //check if browser support navigator.sendBeacon
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url_post + params);
    } else {
      var img = document.createElement("IMG");
      img.setAttribute("src", url + params);
      img.setAttribute("width", "0");
      img.setAttribute("height", "0");
      img.setAttribute("style", "display: block;");
      img.setAttribute("alt", "adobe tracking");
      img.setAttribute("title", "adobe tracking");
      document.body.appendChild(img);
    }
  },
  //parameter validation
  /*
    1. not in black list
    2. value should be string, number or boolean
     */
  validParam: function (ele, s) {
    if (
      s.hasOwnProperty(ele) &&
      !!s[ele] &&
      inhouseBiztra.blacklist.indexOf(ele.toLowerCase()) < 0 &&
      ele.length > 1 && // length should more than 1
      (typeof s[ele] === "string" ||
        typeof s[ele] === "number" ||
        typeof s[ele] === "boolean")
    ) {
      return true;
    }
    return false;
  },
  //check device , mobile, desktop
  deviceType: function () {
    //return window.__SITE__ && window.__SITE__.device === 'm' ? 'mobile' : 'desktop';
    return (window.__SITE__ && window.__SITE__.device === "m") ||
      (s && s.eVar42 && s.eVar42.toLowerCase() === "mbl")
      ? "mobile"
      : "desktop";
  },
  //referrer url
  referrer: function () {
    return document && document.referrer ? document.referrer : "";
  },
  //get first 4 section of prop19(NVTC)
  cusuid: function (s) {
    s = s || window.s;
    if (!s) {
      return;
    }
    var nvtcArr,
      nvtc = s.prop19;
    if (nvtc) {
      nvtcArr = nvtc.split(".");
      if (nvtcArr && nvtcArr.length == 7) {
        return nvtcArr.slice(0, 4).join(".");
      }
    }
  },
  //trackint type, click / load event
  trackingType: {
    load: "load",
    click: "click",
  },
  //add more custom parameters to BI
  processParams: function (data, params) {
    //load/click event share the same value
    var url =
      "?sendTime=" +
      encodeURIComponent(new Date().toISOString()) +
      data +
      "&deviceType=" +
      encodeURIComponent(inhouseBiztra.deviceType());
    //load / click may have different value
    if (params) {
      for (var ele in params) {
        url += "&" + ele + "=" + encodeURIComponent(params[ele]);
      }
    }
    return url;
  },
  //sort variable
  sort: function (arr) {
    if (Array.prototype.sort) {
      if (String.prototype.localeCompare) {
        arr = arr.sort(function (a, b) {
          return a.localeCompare(b, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        });
      } else {
        arr = arr.sort(function (a, b) {
          if (a > b) return 1;
          if (a < b) return -1;
          return 0;
        });
      }
    }
    return arr;
  },
  //custom variable pattern, ex: prop1, eVar1, list1
  customVarPattern: /^prop\d+$|^eVar\d+$|^list\d+$/,
  addMissingVars: function (s) {
    //process eVar15
    s["eVar15"] = s["eVar15"] || document.location.href.split("?")[0];
  },
  appendCustomVars: function (isClick, linkName) {
    var customVars = {},
      referrerURL = inhouseBiztra.referrer(),
      cusuid = inhouseBiztra.cusuid();
    //add referr if it's not in s
    if (referrerURL && !s.referrer) {
      customVars["referrer"] = referrerURL;
    }
    if (isClick) {
      customVars["trackingType"] = inhouseBiztra.trackingType.click;
      if (linkName && !s.linkName) {
        customVars["linkName"] = linkName;
      }
    } else {
      customVars["trackingType"] = inhouseBiztra.trackingType.load;
    }
    //add nvtc 4 section as unique customer id
    if (cusuid) {
      customVars["cusuid"] = cusuid;
    }
    //add adobe vs GA4
    customVars["analyticsid"] = "adobe";
    //add pageURL if there is no
    if (!s.pageURL) {
      customVars["pageURL"] = document.location.href;
    }

    return customVars;
  },
  copyPageLoadVars: function (data) {
    window.neg_adobescp = data;
  },
};

//process page load event
var sentToPacketBeat = function (s) {
  try {
    s = s || window.s;
    if (!s) return;
    var data = "",
      paramArr = [],
      scp = {};

    //process missing vars
    inhouseBiztra.addMissingVars(s);

    //get valid variable
    for (var ele in s) {
      if (inhouseBiztra.validParam(ele, s)) {
        paramArr.push("&" + ele + "=" + encodeURIComponent(s[ele]));
        scp[ele] = s[ele];
      }
    }
    //add the custom parameters to bi
    if (paramArr.length > 0) {
      //sort variable
      paramArr = inhouseBiztra.sort(paramArr);
      //add csutom params
      data = inhouseBiztra.processParams(
        paramArr.join(""),
        inhouseBiztra.appendCustomVars()
      );
      //build img to page
      inhouseBiztra.buildImg(data);
      //copy page load variables to a new window.neg_adobescp
      inhouseBiztra.copyPageLoadVars(scp);
    }
  } catch (e) {
    //console.error(e);
  }
};

//process click event
var sentToPacketBeatClick = function (s, name) {
  try {
    s = s || window.s;
    if (!s) return;
    var data = "",
      paramArr = [],
      trackVars = s.linkTrackVars && s.linkTrackVars.split(","); //current click variables

    //process missing vars
    inhouseBiztra.addMissingVars(s);

    //get valid variabes
    for (var ele in s) {
      if (inhouseBiztra.validParam(ele, s)) {
        //custom variable , only sent the value in trackVars
        if (inhouseBiztra.customVarPattern.test(ele)) {
          if (
            trackVars.indexOf(ele) >= 0 ||
            inhouseBiztra.whitelist.indexOf(ele.toLowerCase()) > -1
          ) {
            paramArr.push("&" + ele + "=" + encodeURIComponent(s[ele]));
          }
        } else {
          //pre-define variables
          paramArr.push("&" + ele + "=" + encodeURIComponent(s[ele]));
        }
      }
    }
    //add comter parameters to bi
    if (paramArr.length > 0) {
      //sort
      paramArr = inhouseBiztra.sort(paramArr);
      //add custom params

      data = inhouseBiztra.processParams(
        paramArr.join(""),
        inhouseBiztra.appendCustomVars(true, name)
      );
      //build img to page
      inhouseBiztra.buildImg(data);
    }
  } catch (e) {
    //console.error(e);
  }
};

/* GA4 in-house */
function inhouseBiztraGA4(props) {}
inhouseBiztraGA4.prototype = {
  constructor: inhouseBiztraGA4,
  //cookies: document.cookie,
  //referrer url
  referrer: function () {
    return document && document.referrer ? document.referrer : "";
  },
  //get first 4 section of prop19(NVTC)
  cusuid: function (data) {
    try {
      //get nvtc from dataLayer first, if not found then get from cookies
      var pattern = /NVTC=([A-Za-z0-9.]+)(;|$)/i,
        nvtc,
        arr = [];
      //get form dataLayer
      if (data) {
        nvtc = JSON.parse(data).nvtc;
        if (nvtc) {
          return nvtc.split(".").splice(0, 4).join(".");
        }
      }
      if (pattern.test(document.cookie)) {
        nvtc = pattern.exec(document.cookie)[1];
        return nvtc.split(".").splice(0, 4).join("."); //248326808.0001.ikoq9pqmh.1624297502
      }
    } catch (e) {}
  },
  //append custom variables
  appendCustomVars: function (data) {
    var customVars = {
        sendTime: new Date().toISOString(),
        referrerURL: this.referrer(),
        cusuid: this.cusuid(data),
        page_shorturl: document.location.href.split("?")[0],
        page_fullurl: document.location.href,
        analyticsid: "ga4",
      },
      customVarsStr = "";

    for (var v in customVars) {
      if (!customVarsStr) {
        customVarsStr += v + "=" + encodeURIComponent(customVars[v]);
      } else {
        customVarsStr += "&" + v + "=" + encodeURIComponent(customVars[v]);
      }
    }
    return customVarsStr;
  },
  //build image to send data
  buildImg: function (queryStr, data) {
    //service
    var url = "https://esuohni.onewegg.com/p.gif";
    var url_post = "https://esuohni.onewegg.com/p";
    data = data.toLowerCase();

    //check if browser support navigator.sendBeacon
    if (navigator.sendBeacon) {
      //ex. navigator.sendBeacon('https://ih.newegg.com/p?lynn=tt11&prop19=248326808.0001.rena70gj8.1658273961.1663619225.1663620700.447&ddd={"evara1":"911lyntt"}', new Blob([JSON.stringify({jason:'911lyntt'})], {type: 'application/json',}))
      navigator.sendBeacon(
        url_post + "?" + queryStr,
        new Blob([data], {
          type: "application/json",
        })
      );
    } else {
      var img = document.createElement("IMG");
      img.setAttribute(
        "src",
        url + "?" + queryStr + "&ga4json=" + encodeURIComponent(data)
      );
      img.setAttribute("width", "0");
      img.setAttribute("height", "0");
      img.setAttribute("style", "display: block;");
      img.setAttribute("alt", "adobe tracking");
      img.setAttribute("title", "adobe tracking");
      document.body.appendChild(img);
    }
  },
  send: function (data) {
    this.buildImg(this.appendCustomVars(data), data);
  },
};
//process GA4 data from website , json string
var sendGAToPacketBeat = function (data) {
  try {
    new inhouseBiztraGA4({}).send(data);
  } catch (e) {
    //console.error(e);
  }
};

/* landing page ga4 */
function GA4LPHandler() {
  window.dataLayer = window.dataLayer || [];
}
GA4LPHandler.prototype = {
  constructor: GA4LPHandler,
  pushDataLayer: function (data) {
    window.dataLayer.push(data);
  },
  sendToInhouse: function (data) {
    sendGAToPacketBeat(JSON.stringify(data));
  },
  send: function (data) {
    this.pushDataLayer(data);
    this.sendToInhouse(data);
  },
  addCommonParams: function (data) {
    data.page_type = data.page_type || "landingpage";
    data.previous_page = GA4Util.getPreviousPageName();
    data.device_name = GA4Util.getDeviceName()
      ? GA4Util.getDeviceName().toLowerCase()
      : "";
    data.environment_type = GA4Util.getEnvironmentType()
      ? GA4Util.getEnvironmentType().toLowerCase()
      : "";
    data.login_status = GA4Util.getLoginStatus().toLowerCase();
    data.country_code = GA4Util.getCountryCode().toLowerCase();
    data.currency_code = GA4Util.getCurrencyCode().toLowerCase();
    data.language_selected = "en-us";
    data.cm_mmc = GA4Util.getCM_MMC();
    data.cm_sp = GA4Util.getCM_SP();
    data.nvtc = GA4Util.getNVTC();
    return data;
  },
  sendLPPageView: function (data) {
    data.event = "page_view";
    data.page_name = data.page_name ? data.page_name.toLowerCase() : "";
    data.page_type = data.page_type ? data.page_type.toLowerCase() : "";
    this.send(this.addCommonParams(data));
  },
  sendLPClick: function (data) {
    this.send(this.addCommonParams(data));
  },
  sendPageView: function (data) {
    this.sendLPPageView(data);
  },
};
var GA4Util = {
  tabletPattern: /(ipad|tablet)/i,
  mobilePattern: /(iphone|android|opera mini|mobile|windows phone)/i,
  mobileAppPattern: /Newegg(.+)App/i,
  getCookieValue: function (cookieName) {
    try {
      var pattern = new RegExp(cookieName + "=([^;]+)(;|$)", "i");
      if (pattern.test(document.cookie)) {
        return pattern.exec(document.cookie)[1].toLowerCase();
      } else {
        return "";
      }
    } catch (e) {
      return "";
    }
  },
  encodeValue: function (value) {
    return encodeURIComponent(value);
  },
  getPreviousPageName: function () {
    try {
      var rawValue = this.getCookieValue("NV%5FGAPREVIOUSPAGENAME");
      if (rawValue) {
        return decodeURIComponent(rawValue).split("|")[0].toLowerCase();
      } else {
        return "";
      }
    } catch (e) {
      return "";
    }
  },
  getEnvironmentType: function () {
    if (this.mobileAppPattern.test(navigator.userAgent)) {
      return "app";
    }
    if (
      this.mobilePattern.test(navigator.userAgent) &&
      !this.tabletPattern.test(navigator.userAgent)
    ) {
      return "mobile";
    }
    return "desktop";
  },
  getDeviceName: function () {
    try {
      if (this.mobilePattern.test(navigator.userAgent)) {
        var deviceName = this.mobilePattern.exec(navigator.userAgent)[0];
        return /^ip/i.test(deviceName) ? deviceName : deviceName + " phone";
      } else {
        return "desktop";
      }
    } catch (e) {
      return "desktop";
    }
  },
  getLoginStatus: function () {
    try {
      return /%22sc%22/i.test(document.cookie) ? "true" : "false";
    } catch (e) {
      return "false";
    }
  },
  getCountryCode: function () {
    //newegg business
    if (/neweggbusiness\.com/.test(document.location.hostname)) {
      return "usb";
    }
    return this.getCookieValue("NV%5FW57");
  },
  getCurrencyCode: function () {
    try {
      var currencyPattern = /%22w58%22%3A%22([a-z]{3})%22%/i;
      if (currencyPattern.test(document.cookie)) {
        return currencyPattern.exec(document.cookie)[1];
      } else {
        return "usd";
      }
    } catch (e) {
      return "usd";
    }
  },
  getNVTC: function () {
    return this.getCookieValue("NVTC");
  },
  getParaFromURL: function (para) {
    try {
      var pattern = new RegExp("(\\?|&)" + para + "=([^&]+)(&|$)", "i"),
        url = document.location.href;
      if (pattern.test(url)) {
        return decodeURIComponent(pattern.exec(url)[2]).toLowerCase();
      } else {
        return "";
      }
    } catch (e) {
      return "";
    }
  },
  getCM_MMC: function () {
    // Priority: get from URL parameters first
    var urlValue = this.getParaFromURL("utm_campaign") || this.getParaFromURL("cm_mmc");
    if (urlValue) {
      return urlValue;
    }
    
    // If URL parameters not found, get from cookie
    var name = "NV_ECM_TK_LC=";
    var ca = document.cookie.split(';');
    var ecmCookie = "";
    
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i].trim();
      if (c.indexOf(name) == 0) {
        ecmCookie = decodeURIComponent(c.substring(name.length, c.length));
        break;
      }
    }
    
    var cookieValue = "";
    if (ecmCookie != "") {
      try {
        var cookie = JSON.parse(ecmCookie)['cm_mmc'];
        cookieValue = cookie.value;
      } catch(err) {
        cookieValue = "";
      }
    }
    
    return cookieValue;
  },
  getCM_SP: function () {
    return this.getParaFromURL("cm_sp");
  },
};

/* legacy(existing) landing page ga4 + bi*/
(function () {
  function legacyLPGA4(prop) {
    if (prop.countryCode) {
      this.countryCode = prop.countryCode.toLowerCase();
    }
  }
  legacyLPGA4.prototype = {
    getGTMLink: function () {
      switch (this.countryCode) {
        case "can":
          return '<script type="text/javascript" src="https://c1.neweggimages.com/webresource/Scripts/plugin/gtm/neggtmcan.js"></script>';
        case "usb":
          return '<script type="text/javascript" src="https://c1.neweggimages.com/webresource/Scripts/plugin/gtm/neggtmb2b.js"></script>';
        default:
          return '<script type="text/javascript" src="https://c1.neweggimages.com/webresource/Scripts/plugin/gtm/neggtmusa.js"></script>';
      }
    },
    isLandingPage: function () {
      return (
        /promotions\.newegg/i.test(document.location.hostname) ||
        /^\/promotions\//.test(document.location.pathname)
      );
    },
    islegacyLP: function () {
      //check if the gtm already added
      return !/id=GTM-(WJ2PC5C|W26F4QT|MNQ95QK)/i.test(jQuery("head").html());
    },
    injectGTM: function () {
      jQuery("head").append(this.getGTMLink());
    },
    injectGA4: function (data) {
      jQuery("body").append(
        '<script type="text/javascript"> try {new GA4LPHandler().sendLPPageView({"page_name": "' +
          data.pageName +
          '"})} catch (e) {}</script>'
      );
    },
  };
  try {
    var legacyLP = new legacyLPGA4({
      countryCode: GA4Util.getCountryCode(),
    });
    //only inject ga4 to legency landing page
    if (legacyLP.isLandingPage() && legacyLP.islegacyLP()) {
      //inject GTM code
      legacyLP.injectGTM();
      //inject code to push page_view event to dataLayer
      if (s && s.pageName) {
        legacyLP.injectGA4({
          pageName: s.pageName,
        });
      } else {
        var ga4Interval = setInterval(function () {
          if (s && s.pageName) {
            legacyLP.injectGA4({
              pageName: s.pageName,
            });
            clearInterval(ga4Interval);
          }
        }, 100);
      }
    }
  } catch (e) {}
})();
