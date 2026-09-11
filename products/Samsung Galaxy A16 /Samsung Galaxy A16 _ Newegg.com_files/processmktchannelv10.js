//Note: Do not update the file name of this file anymore, keep the file name 'processmktchannelv10.js'
(function () {
    // search engine
    const natural = [
        'google',
        'bing',
        'duckduckgo',
        'yahoo',
        'yandex',
        'baidu',
        'naver',
        'aol',
        'dogpile',
        'info',
        'Ask',
        'daum',
        'wow',
        'optimum',
        'seznam',
        'reference',
        'myway',
        'infospace',
        'virgilio',
        'tiscali',
        'mywebsearch',
        'ler',
        'alhea',
        'contenko',
        'daum',
        'brave'
    ]
    const internalDomain = [
        'newegg.com',
        'gamecrate.com',
        'abs.com',
        'checkout.us.zip.co',
        'zip.co',
        'checkout.quadpay.com',
        '3debspay.boc.cn',
        'alfabank.ru',
        'arcot.com',
        'billmelater.com',
        'citibank.co.kr',
        'ftpsllc.com',
        'garanti.com.tr',
        'hyundaicard.com',
        'kbcard.com',
        'keb.co.kr',
        'masterpass.com',
        'mycardsecure.com',
        'newegg3.com.sh',
        'paypal.com',
        'samsungcard.co.kr',
        'secure2gw.ro',
        'securecode.com',
        'secureserver.net',
        'securesuite.co.uk',
        'securesuite.net',
        'shinhancard.com',
        'verifiedbyvisa.com',
        'visa.com',
        'visa.com.ar',
        'web.v.me',
        'secondfunnel.com',
        'cardinalcommerce.com',
        'secure.neweggbusiness.com',
        'www-newegg-com.cdn.ampproject.org',
        'www.newegg.ca',
        'secure.newegg.ca',
        'kb.neweggbusiness.com',
        'www.neweggbusiness.com',
        'help.newegg.ca',
        'secure.m.newegg.ca',
        'secure.newegg.com',
        'www.rosewill.com',
        'neweggbusiness.com',
        'sellerportal.newegg.cn',
        'partner.gqc.newegg.space',
        'help.neweggbusiness.com',
        'secure.newegg6.com.sh',
        'sellerportal62780.gqc.newegg.space',
        'central3.newegg.org',
        'partner.newegg.cn',
        'secure.newegg4.com.sh',
        'newegg.io',
        'newegggpu.com',
        'justgpu.com',
        'bi.newegg.org',
        'bi-tool.newegg.org',
        'e11ssltest.newegg.ca',
        'e11ssltest.newegg.com',
        'e11stgtest-secure-m.newegg.ca',
        'e11wwwtest.newegg.ca',
        'e11wwwtest.newegg.com',
        'guest.newegg.org',
        'help.newegg.org',
        'jira.newegg.org',
        'kb.newegg.ca',
        'newegg.ca',
        'newegg.knoji.com',
        'promotions.newegg.ca',
        'www.newegg4.org',
        'www-newegg-ca.cdn.ampproject.org',
        'www-newegg-ca.translate.goog',
        'www.affirm.com',
        'www.affirm.ca',
        'capitaloneshopping.com',
        'accounts.google.com',
        'outlook.live.com',
        'mail.google.com',
        'appleid.apple.com',
        'statics.teams.cdn.office.net ',
        'bitpay.com',
        'accounts.google.com'
    ]
    // support new channel ai search, added by gavin 2025/07/29
    const aiReferrers = [
        'gemini.google.com',
        'chatgpt.com',
        'claude.ai',
        'copilot.microsoft.com',
        'www.perplexity.ai'
    ];
    const aiUtmSources = [
        'chatgpt.com',
        'perplexity'
    ];

    const NATURAL_AMP_PREFIX = 'Natural-AMP|';
    const NATURAL_PREFIX = 'Natural|'
    const AI_SEARCH_PREFIX = 'AI-Search|';
    const REFERRING_PREFIX = 'referring|'
    const FIRST_COOKIE_KEY = 'NV_MC_FC'
    const LAST_COOKIE_KEY = 'NV_MC_LC'
    const SPECIFIC_PARAMETER_KEY_UTM_CAMPAIGN = 'utm_campaign'
    const SPECIFIC_PARAMETER_KEY_UTM_SOURCE = 'utm_source';
    const PAID_SEARCH_EXTRA_PARAMETER = 'id12'
    const DOMAIN = document.domain.includes('.newegg.ca') ? '.newegg.ca' : '.newegg.com'

    function isNil(value) {
        return value === undefined || value === null || value === ''
    }

    function getSearchParams(key) {
        return new URL(location.href).searchParams.get(key)
    }

    function getReferrer() {
        try {
            return new URL(document.referrer)?.host
        } catch {
            return document.referrer
        }
    }

    function getExpireTime() {
        const EXPIRE_TIME = 30 * 24 * 60 * 60 * 1000
        const expireDate = new Date(Date.now() + EXPIRE_TIME)
        return expireDate.toUTCString()
    }

    function getCookieValue(key) {
        var v = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)')
        return v ? v[2] : null
    }

    function setCookieValue(key, value) {
        if (isNil(value)) {
            return
        }
        const expires = getExpireTime()
        document.cookie = key + '=' + value + ';expires=' + expires + ';domain=' + DOMAIN + ';path=/' + ';Secure' + ';SameSite=None;'
    }

    function getFormattedValue() {
        const utmCampaign = getSearchParams(SPECIFIC_PARAMETER_KEY_UTM_CAMPAIGN)
        const id12 = getSearchParams(PAID_SEARCH_EXTRA_PARAMETER)
        const utmSource = getSearchParams(SPECIFIC_PARAMETER_KEY_UTM_SOURCE) || '';
        const referrer = getReferrer() || ''
        const fromNatural = natural.some(item => referrer.toLowerCase().includes(item.toLowerCase()))
        const fromExternalDomain = !internalDomain.some(item => referrer.toLowerCase().includes(item.toLowerCase()))
        const fromAMP = document.referrer.toLowerCase().indexOf("/amp/") > -1
        const fromAIReffer = aiReferrers.some(item => referrer.toLowerCase().includes(item.toLowerCase()));
        const fromAIUtmSource = aiUtmSources.some(item => utmSource.toLowerCase().includes(item.toLowerCase()));

        if (!isNil(utmCampaign)) {
            return !isNil(id12) ? encodeURIComponent(utmCampaign + '-_-' + PAID_SEARCH_EXTRA_PARAMETER + '-' + id12) : encodeURIComponent(utmCampaign)
        }
        if(fromAIReffer){
            return AI_SEARCH_PREFIX + encodeURIComponent(referrer);
        }
        if(fromAIUtmSource){
            return AI_SEARCH_PREFIX + encodeURIComponent(utmSource);
        }
        if (!isNil(referrer) && fromNatural && fromExternalDomain) {
            return NATURAL_PREFIX + encodeURIComponent(referrer)
        }
        if (!isNil(referrer) && fromAMP) {
            var prefix = referrer + "/amp/";
            return NATURAL_AMP_PREFIX + encodeURIComponent(prefix + '-_-' + document.referrer);
        }
        if (!isNil(referrer) && fromExternalDomain) {
            return REFERRING_PREFIX + encodeURIComponent(referrer)
        }
        return undefined
    }

    const firstCookieValue = getCookieValue(FIRST_COOKIE_KEY)
    const lastCookieValue = getCookieValue(LAST_COOKIE_KEY)
    const formateedValue = getFormattedValue()

    if (isNil(firstCookieValue)) {
        setCookieValue(FIRST_COOKIE_KEY, formateedValue)
        setCookieValue(LAST_COOKIE_KEY, formateedValue)
    }else{
        if (lastCookieValue !== formateedValue) {
            setCookieValue(LAST_COOKIE_KEY, formateedValue)
        }
    }

    //procee ga4 dataLayer value,merge from processcm.js on 3/21/2024
    const ECM_COOKIE_NAME = 'NV_ECM_TK_LC';
    //The new meaning of 'cm_mmc' is:
    //1. only depends on the parameter 'utm_campaign' value in the browser url, and no longer depends on the parameter of 'cm_mmc' (invalid).
    //2. is a historical copy of the 'utm_campaign' value in the cookie, used for scenarios where page A (with utm_campaign) to page B (without utm_campaign).
    //3. in page B, all event will be sent the cm_mmc attribute.
    const ECM_COOKIE_KEY = ['icid', 'cm_sp', 'cm_mmc', 'label'];


    let ecm_searchParams = new URLSearchParams(location.search);
    let ecm_now = new Date().getTime();
    let ecm_expiration = new Date(ecm_now + (1000 * 24 * 60 * 60 * 1000)).toUTCString();
    let ecm_suEexpiration = new Date(ecm_now + (30 * 24 * 60 * 60 * 1000)).getTime();

    let ecms = ecm_getCookie(ECM_COOKIE_NAME) || {};
    let ecm_flag = false;
    try {
        ecms = JSON.parse(ecms);
    } catch (e) { }

    ECM_COOKIE_KEY.map(function (v, i) {
        let subCooKie = ecms[v] || {};
        let param = ecm_searchParams.get(v);
        if (v == 'cm_mmc') {
            param = getFormattedValue();
        }
        if (param) {
            subCooKie.value = param;
            subCooKie.expiretime = ecm_suEexpiration;
            ecm_flag = true;
        } else if (subCooKie.expiretime && ecm_now > subCooKie.expiretime) {
            subCooKie.value = '';
            subCooKie.expiretime = ecm_suEexpiration;
            ecm_flag = true;
        }
        ecms[v] = subCooKie;
    });
    ecm_flag && ecm_setCookie(ECM_COOKIE_NAME, JSON.stringify(ecms));

    function ecm_getCookie(cname) {
        let name = cname + '=';
        let ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(name) == 0) return decodeURIComponent(c.substring(name.length, c.length));
        }
        return '';
    }

    function ecm_setCookie(cname, cvalue) {
        let hostNameArr = location.hostname.split(".");
        document.cookie = cname + "=" + encodeURIComponent(cvalue) + ";expires=" + ecm_expiration +
            "; domain=" + hostNameArr.slice(hostNameArr.length - 2).join(".") + "; path=/" + ";Secure" + ";SameSite=None;";
    }
})()