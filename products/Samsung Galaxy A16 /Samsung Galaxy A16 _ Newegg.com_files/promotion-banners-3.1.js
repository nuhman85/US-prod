// function main
jQuery(document).ready(function () {
    var reg = /newegg.com\/(global\/[a-z]{2}-en\/)/ig;
    var matchs=reg.exec(location.href);
    var g=matchs?matchs[1]:"";

    var banners = [
        {
          imgURL: 'https://promotions.newegg.com/tools/images/game-room-builder.png',
          linkTo: 'tools/game-room-builder?cm_sp=banner-_-from-keyword-search-result-page',
          title: 'Game Room Builder',
          keyword: [
              'keyboard',
              'mouse pad',
              'mousepad',
              'mouse',
              'headset',
              'headphone',
              'monitor',
              'chair',
              'desk',
              'led lights',
              'speaker',
              'controller',
              'webcam',
              'vr',
              'gaming pc','gaming laptop','best gaming desktop pc','prebuilt gaming pc','gaming monitor','gaming desktop'
          ]
      },
      {
        imgURL: 'https://promotions.newegg.com/tools/images/sonicwall-1920x120.png',
        linkTo: 'SonicWall-3/EventSaleStore/ID-1186?cm_sp=plp-pro-banner-_-PLP-_-sonicwall-3andfree',
        title: 'Sonicwall3',
        onlyUSA: true,
        startDate: '2025/11/21',
        endDate: '2026/11/21',
        keywordList: ['firewall','sonicwall','sonicwall 02-ssc-7305','firewall appliance','firewalls']
      },
      {
        imgURL: 'https://promotions.newegg.com/amd/24-1038/banner/1920x120.jpg',
        linkTo: 'promotions/amd/24-1038/index.html',
        title: 'X870',
        onlyUSA: true,
        startDate: '2024/9/29',
        endDate: '2024/10/3',
        keywordList: ['x870e','x870','x870 motherboard','x870 board','x870e motherboard','x870 chipset','amd x870','asus x870','rog crosshair x870e hero','gigabyte x870','gigabyte x870e','asrock x870e','asus x870e','x870e aorus master','rog strix x870e-e gaming wifi','asrock x870','msi x870e','x870-i','rog strix x870-a gaming wifi','x870e aorus pro ice','amd x870e','rog strix x870-i gaming wifi','msi x870','gigabyte x870e aorus pro']
      },
      {
        imgURL: 'https://promotions.newegg.com/tools/images/abs-banner-1920x120.png',
        linkTo: 'Save-On-ABS-Gaming-PCs/EventSaleStore/ID-102',
        title: 'ABS',
        onlyUSA: true,
        startDate: '2024/8/7',
        endDate: '2024/9/7',
        keywordList: ['aipc', 'pc', 'desktop', 'desktop pc', 'gaming desktop', 'abs', 'abs desktop', 'abs gaming', 'abs gaming pc', 'pre-built', 'pre-built gaming pc']
      },
      {
        imgURL: window.devicePixelRatio > 1 ? 'https://promotions.newegg.com/server/23-1381/1920x120@2x.jpg' : 'https://promotions.newegg.com/server/23-1381/1920x120.jpg',
        linkTo: 'server-system-configurator',
        title: 'Server Configurator',
        onlyUSA: true,
        subcategoryIds: [8,386,3087],
        keywordLinkTo: 'server-system-configurator/AI',
        keyword: ['AI']
      },
      {
        imgURL: 'https://promotions.newegg.com/mcafee/24-0691/1920x160.jpg',
        linkTo: 'McAfee/BrandStore/ID-1486',
        title: 'McAfee',
        onlyUSA: true,
        startDate: '2024/7/1',
        endDate: '2024/8/30',
        keywordList: ['360 antivirus', 'ad blocker', 'ad blocker for silk browser', 'AI', 'ai software', 'amazon associates product', 'android security', 'anti viris', 'anti virous', 'anti virus', 'anti virus computer software 2024', 'anti virus for mac', 'anti virus for pc', 'anti virus programs', 'anti virus software 2024', 'anti virus software 2024 for laptop', 'anti virus software for pc', 'antibirus', 'antiviru', 'antivirus', 'antivirus for fire tablet', 'antivirus for kindle fire free', 'antivirus for pc', 'antivirus internet security', 'antivirus mac os', 'antivirus program', 'antivirus software', 'antivirus software 2024', 'antivirus software 2024 total protection', 'antivirus software for chromebook', 'antivirus software for kindle fire', 'antivirus webroot', 'antivirus windows', 'apple antivirus', 'avast antivirus software 2024', 'avg antivirus', 'avg ultimate 2024', 'best antivirus', 'bitdefender', 'bitdefender 10 devices 2 years', 'bitdefender 2024', 'bitdefender internet security', 'bitdefender total security', 'bitdefender total security 2024', 'bitdefender total security 2024 2 year', 'bitdefender total security 2024 5 devices', 'bitdefender total security deal', 'bitdefender total security deals', 'business software', 'business software programs', 'computer virus protection', 'computer virus protection 2024', 'computer virus protector', 'copilot', 'crm software for small business', 'crowdstrike', 'crowdstrike falcon', 'cybersecurity', 'device security', 'digital downloads', 'digital marketing software', 'digital software', 'docking station', 'download turbotax', 'eset', 'eset internet security', 'eset internet security 2024', 'eset nod32', 'eset nod32 antivirus', 'eset nod32 antivirus 2024', 'eset security', 'express vpn', 'financial planner software', 'financial software', 'fix it stick', 'fix me stick', 'fix me stick for laptop', 'fix me sticks', 'fix stick', 'fixit stick', 'fix-it sticks', 'fixit sticks tool kit', 'fixmestick', 'fixmestick for windows 10', 'free antivirus for amazon fire tablet', 'free antivirus software', 'free vpn', 'hr block', 'hr block software', 'identity software', 'identity theft', 'internet protection', 'internet security', 'internet security and antivirus 2024', 'internet security device', 'internet security suites', 'intuit quickbooks login', 'kaspersky', 'kaspersky antivirus', 'kaspersky internet security', 'kaspersky internet security 2024', 'kaspersky plus', 'kaspersky total security 2024', 'life lock norton', 'malware', 'malware and virus cleaner for fire devices', 'malware protection', 'malwarebytes premium 2024', 'mcafee', 'mcafee +', 'mcafee 2024', 'mcafee advanced', 'mcafee antivirus', 'mcafee antivirus 2 year', 'mcafee antivirus 2 years', 'mcafee antivirus 2024', 'mcafee antivirus software', 'mcafee livesafe', 'mcafee livesafe 2024', 'mcafee plus', 'mcafee software', 'mcafee total protection', 'mcafee total protection 2024', 'mcafee total protection 2024 1 device', 'mcafee total protection 2024 3 devices', 'mcafee total protection 2024 5 devices', 'mcafee total protection 2024 unlimited devices', 'mcafee+', 'mcaffee', 'mcfee', 'microsoft 365', 'microsoft 365 personal', 'microsoft copilot', 'microsoft office', 'microsoft office 2024', 'microsoft office lifetime', 'microsoft surface', 'microsoft word', 'ms office', 'nord vpn', 'nordvpn', 'norton', 'norton 360', 'norton 360 deluxe', 'norton 360 deluxe 2024', 'norton 360 deluxe 2024 3 devices', 'norton 360 deluxe 2024 5 devices', 'norton 360 for fire tablet', 'norton 360 premium', 'norton 360 premium 10 devices', 'norton 360 premium 5 devices', 'norton account', 'norton antivirus', 'norton anti-virus', 'norton antivirus 2024', 'norton deluxe 360 2022', 'norton platinum 360', 'norton protection', 'norton security', 'norton utilities', 'norton utilities ultimate', 'norton utilities ultimate 2024', 'norton utility ultimate', 'norton360', 'ofertas relampago', 'operating system for pc', 'outlook', 'pc matic antivirus software', 'pc protection software', 'pc security', 'quickbooks desktop pro 2024', 'quickbooks intuit login', 'quicken', 'quicken classic deluxe 2024', 'quicken deluxe', 'quicken deluxe 2024', 'quicken premier', 'quicken software', 'refurbished laptops', 'remarkable 2', 'runescape', 'secure vpn', 'security software', 'security+', 'snapdragon', 'snapdragon x', 'software', 'software download', 'software downloads', 'software for computer', 'software office', 'tax cut', 'tax software', 'total av', 'tower computers', 'turbo tax', 'turbo tax online', 'turbotax', 'turbo-tax', 'turbotax 2024', 'turbotax business', 'turbotax deluxe', 'turbotax digital', 'turbotax download', 'turbotax premier', 'video editing equipment list', 'virus protection', 'virus protection software 2024', 'vpn', 'vpn device', 'vpn software', 'webroot', 'webroot antivirus software 2024', 'webroot internet security', 'webroot internet security complete', 'webroot internet security complete 2024', 'webroot secure anywhere 2024', 'webroot secure anywhere internet security complete 2024', 'website design software', 'windows 10', 'windows 10 pro software', 'windows 11 home', 'windows 11 key', 'windows software']
      },
      {
        imgURL: 'https://promotions.newegg.com/tools/images/newegg-gift-card-1900x120.png',
        linkTo: 'p/N82E16800999157',
        title: 'Newegg Gift Cards',
        subcategoryIds: [3185,3184,3178,3188,3183,3181,3190,3187,3177,3179,3186]
      },
      {
        imgURL: 'https://promotions.newegg.com/asus/24-0852/1920x120.jpg',
        linkTo: 'asus-nuc-configurator',
        title: 'ASUS NUC Configurator',
        keyword: ['nuc', 'mini pc']
      },
      {
        imgURL: 'https://promotions.newegg.com/nepro/23-1273/banner/1920x120.jpg',
        linkTo: 'promotions/nepro/23-1322/index.html',
        title: 'Trade-In Program',
        onlyUSA: true,
        endDate: '2026/1/1',
        subcategoryIds: [343,48]
      }
    ];
    var getCMSP = function (params) {
      return params.searchKeywords ?
        "plp-pro-banner-_-" + params.pageName + "-_-" + params.searchKeywords :
        "plp-pro-banner-_-" + params.pageName;
    };
    var sendGA4 = function (event, cm_sp) {
      window.__ga_push({
        event: event,
        legacy_element_value: cm_sp
      });
    };
    var buildLink = function (link, cm_sp) {
      link = "https://" + window.location.hostname + '/' + g + link;
      var url = new URL(link);
      url.searchParams.set('cm_sp', cm_sp);
      return url.href;
    };
    var pLPClick = function () {
      var _a;
      var pageKeywords = tackPLPPageParams();
      //click tracking
      sendGA4('legacy_click', getCMSP({
        pageName: (_a = getPageInfo()) === null || _a === void 0 ? void 0 : _a.pageName,
        searchKeywords: pageKeywords
      }));
      return true;
    };
    var getPageInfo = function () {
      return {
        pageName: "PLP"
      };
    };
    var tackPLPPageParams = function () {
      var search = window.location.search.substring(1);
      var params = new URLSearchParams(search);
      var searchKeyword = params.get('d');
      var searchKeywordEncoded = decodeURIComponent(searchKeyword || '');
      return searchKeywordEncoded;
    };
    var isSpecificKeyword =function(pageKeywords, keywords) {
      if(typeof pageKeywords === 'undefined' || pageKeywords == null){return false;}
      if(typeof keywords === 'undefined' || keywords == null){return false;}

      var contains = false
      for (var i = 0; i < keywords.length; i++) {
        if(isSpecificSingleKeyword(pageKeywords, keywords[i])) {
          contains = true;
          break;
        }
      }

      return contains;
    };
    var isSpecificSingleKeyword = function (pageKeywords, keyword) {
      if(typeof pageKeywords === 'undefined' || pageKeywords == null){return false;}
      if(typeof keyword === 'undefined' || keyword == null){return false;}
      var pk = pageKeywords.trim().toLowerCase().split(' ');
      var k = keyword.trim().toLowerCase().split(' ');

      return k.every(function(val) { return pk.includes(val); });
    };
    var drawPLPBanner = function (bannerConfig) {
        var _a, _b;
        var pageKeywords = tackPLPPageParams();
        // draw banner
        // create banner element
        var banner = function () {
            var _a, _b, _c, _d;
            var link = bannerConfig.linkTo;
            if(isSpecificKeyword(pageKeywords, bannerConfig.keyword)){
              if(typeof bannerConfig.keywordLinkTo !== 'undefined' && 
                bannerConfig.keywordLinkTo != null &&
                bannerConfig.keywordLinkTo != ''){
                link = bannerConfig.keywordLinkTo;
              }
            }
            var banner = document.createElement('div');
            banner.id = 'PLP_Promotion_Banner';
            banner.classList.add('width-100');
            banner.innerHTML = "\n        <a target=\"_blank\" href=\"" + buildLink(link, getCMSP({
              pageName: getPageInfo().pageName,
              searchKeywords: pageKeywords
            })) + "\" onclick=\"ADScope.pLPClick(event)\" class=\"banner-flexible\" title=\"" + bannerConfig.title + "\">\n          <img style=\"width:1920px;height:120px\" class=\"banner-flexible-img\" alt=\"" + bannerConfig.title + "\" src=\"" + bannerConfig.imgURL + "\">\n        </a>\n    ";
            return banner;
        };
        // return grid | list
        var getTabStatus = function () {
            var _a;
            var btnList = document.querySelector('.list-tool-view button');
            return ((_a = btnList) === null || _a === void 0 ? void 0 : _a.classList.contains('is-current')) ? 'list' : 'grid';
        };
        var getFirstItemElement = function (value) {
            var tabStatus = getTabStatus();
            if (tabStatus === 'grid' || value === 'grid') {
                var items = document.querySelectorAll('.list-wrap > .expulsion-one-cell > .item-cell');
                if (!items)
                    return null;
                var length_1 = items.length;
                if (length_1 >= 4) {
                    return items[3];
                }
                return items[length_1 - 1];
            } else {
                var items = document.querySelectorAll('.items-list-view .item-cell');
                // PR-4794 filter exact results
                var filteredItems = Array.from(items).filter(item => {
                  return !item.closest('#items-list-exact');
                });

                var length_2 = filteredItems.length;
                if (length_2 >= 2) {
                    return filteredItems[1];
                }
                return filteredItems[length_2 - 1];
            }
        };
        var removeBanner = function () {
            var existingBanner = document.querySelector('#PLP_Promotion_Banner');
            if (existingBanner) {
                existingBanner.remove();
            }
        };
        var insertBanner = function (value) {
            var _a;
            var firstItem = getFirstItemElement(value);
            if (firstItem) {
                (_a = firstItem.parentNode) === null || _a === void 0 ? void 0 : _a.insertBefore(banner(), firstItem.nextSibling);
            }
        };
        // init on page load
        insertBanner();
        // addEventListener on tab change
        var btnList = document.querySelector('.list-tool-view .btn-group-cell:nth-child(1) > button');
        var btnGrid = document.querySelector('.list-tool-view .btn-group-cell:nth-child(2) > button');
        (_a = btnList) === null || _a === void 0 ? void 0 : _a.addEventListener('click', removeBanner);
        (_b = btnGrid) === null || _b === void 0 ? void 0 : _b.addEventListener('click', removeBanner);
        var observer = new MutationObserver(function (mutationsList, observer) {
            insertBanner();
        });
        var config = {
            childList: true,
            attributeFilter: ['class'],
            subtree: false
        };
        if (!btnGrid)
            return;
        observer.observe(btnList, config);
    };

    var usaWebsite = function(g) {
      if(window.location.host.toLowerCase().indexOf('.com') > -1 && g == '') {
        return true;
      }
      return false;
    };

    var canWebsite = function(g) {
      if(window.location.host.toLowerCase().indexOf('.ca') > -1 && g == '') {
        return true;
      }
      return false;
    };

    var compareDate = function(start, end) {
      var nowDate = new Date();
      start = new Date(start);
      end = new Date(end);
      return nowDate >= start && nowDate <= end;
    };

    var maxSubcategory = function(array){
        if(array.length == 0)
            return null;
        var modeMap = {};
        var maxEl = array[0], maxCount = 1;
        for(var i = 0; i < array.length; i++){
            var el = array[i];
            if(modeMap[el] == null)
                modeMap[el] = 1;
            else
                modeMap[el]++;  
            if(modeMap[el] > maxCount){
                maxEl = el;
                maxCount = modeMap[el];
            }
        }
        return maxEl;
    };

    var findBanner = function(){
      if (typeof __initialState__ === 'undefined' ||
          typeof __initialState__.Products === 'undefined' ||
          __initialState__.Products == null ||
          __initialState__.Products.length <= 0) {
        return null;
      }
      var subIds = [];
      for (var i = 0; i < __initialState__.Products.length; i++) {
        if(__initialState__.Products[i].ItemCell != null && 
           __initialState__.Products[i].ItemCell.Subcategory != null &&
           __initialState__.Products[i].ItemCell.Subcategory.SubcategoryId > 0) {
          subIds.push(__initialState__.Products[i].ItemCell.Subcategory.SubcategoryId);
        }
      }
      subIds = [maxSubcategory(subIds)];
      var finders = banners.filter(function(sub) {
        if((typeof sub.subcategoryIds === 'undefined' || sub.subcategoryIds == null || sub.subcategoryIds.length <= 0) &&
          (typeof sub.keywordList === 'undefined' || sub.keywordList == null || sub.keywordList.length <= 0) &&
          (typeof sub.keyword === 'undefined' || sub.keyword == null || sub.keyword=='')){
          return false;
        }
        if(sub.onlyUSA && !usaWebsite(g)) {
          return false;
        }
        if(sub.onlyCAN && !canWebsite(g)) {
          return false;
        }
        if(sub.excludeGlobal && g != '') {
          return false;
        }
        
        if(sub.startDate || sub.endDate) {
          var sd = sub.startDate ? sub.startDate : '2022/1/1';
          var ed = sub.endDate ? sub.endDate : '3100/1/1'
          if (!compareDate(sd, ed)) {
            return false;
          }
        }

        if(sub.subcategoryIds && sub.subcategoryIds.length > 0){
          var f = sub.subcategoryIds.filter(function(id) {
            return subIds.indexOf(id) !== -1;
          });
          if(f == null || f.length <= 0) {
            return false;
          }
        } else if(sub.keyword && sub.keyword != ''){
          var pageKeywords = tackPLPPageParams()
          if(!isSpecificKeyword(pageKeywords, sub.keyword)){
            return false;
          }
        }
        
        if(sub.keywordList && sub.keywordList.length > 0){
          var pageKeywords = tackPLPPageParams()
          var f = sub.keywordList.filter(function(keyword) {
            return keyword === pageKeywords;
          });
          if(f == null || f.length <= 0) {
            return false;
          }
        }
  
        return true;
      });

      if(finders == null || finders.length <= 0) {
        return null;  
      }

      return finders[0];
    };
    
    var main = function () {
      var bannerConfig = findBanner();
      if(bannerConfig == null){
        return;
      }

      window['ADScope'] = {
        pLPClick: pLPClick
      };
      drawPLPBanner(bannerConfig);
      var intersectionObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
            var _a;
            if (entry.isIntersecting) {
                observer.unobserve(entry.target);
                // impression tracking
                sendGA4('legacy_view', getCMSP({
                    pageName: (_a = getPageInfo()) === null || _a === void 0 ? void 0 : _a.pageName,
                    searchKeywords: tackPLPPageParams()
                }));
            }
        });
      });
      var targets = document.querySelectorAll("#PLP_Promotion_Banner");
      targets.forEach(function (target) {
        intersectionObserver.observe(target);
      });
    };
    try {
        main();
    } catch (_a) {}
});
