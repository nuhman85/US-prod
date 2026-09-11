;(function () {
  var util = {
    getUrlParam: function (name) {
      return new URLSearchParams(window.location.search).get(name)
    },

    useImpression: function (node, callback) {
      if (node) {
        if (typeof IntersectionObserver !== 'function') return

        var observer = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) {
            observer.unobserve(node)
            callback && callback(node)
          }
        })
        observer.observe(node)
      }
    },

    useVisibilityOnce: function (node, callback, options) {
      if (!node) {
        callback && callback()
        return
      }

      if (typeof IntersectionObserver !== 'function') {
        callback && callback(node)
        return
      }

      var observer = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          observer.unobserve(node)
          callback && callback(node)
        }
      }, options)
      observer.observe(node)
    },

    sendGa4Fc: function (event, params = {}) {
      window?.__ga_push({
        event: event,
        ...params,
      })
    },

    parseJsonResponse: function (response) {
      if (typeof response !== 'string') return response

      try {
        return JSON.parse(response)
      } catch (e) {
        console.error(e)
        return null
      }
    },

    initPopper: function (callback) {
      if (typeof jQuery.fn.popover === 'function') {
        callback()
      } else {
        jQuery
          .cachedScript('https://imk.neweggimages.com/webresource/scripts/plugin/util-4x.js')
          .done(function () {
            jQuery
              .cachedScript('https://imk.neweggimages.com/webresource/scripts/plugin/popper-4x.js')
              .done(function () {
                callback()
              })
          })
      }
    },
  }

  var productCell = {
    buildProductURL: function (product) {
      const slug = product.Description.UrlKeywords
        ? `${product.Description.UrlKeywords}/`
        : ''
      const pdpItem = product.ParentItem || product.Item
      const base = `https://${document.location.hostname}/${slug}p/${pdpItem}?Item=${product.Item}`

      const sm = product?.SponsoredMsg
      if (!sm) return base

      const cmSp = [
        'SP',
        sm.SponsoredGroupNumber ?? '',
        sm.SponsoredType ?? '',
        sm.SponsoredMatchType ?? '',
        product.Item ?? '',
        sm.SearchKeyword ?? '',
        sm.SponsoredNormalizedKeyword ?? '',
        sm.Position ?? '',
      ].join('-_-')

      const sep = base.includes('?') ? '&' : '?'
      return `${base}${sep}cm_sp=${encodeURIComponent(cmSp)}`
    },

    getRatingEggs: function (ratingOneDecimal) {
      if (ratingOneDecimal >= 1 && ratingOneDecimal <= 1.2) return '1'
      if (ratingOneDecimal >= 1.3 && ratingOneDecimal <= 1.7) return '1-5'
      if (ratingOneDecimal >= 1.8 && ratingOneDecimal <= 2.2) return '2'
      if (ratingOneDecimal >= 2.3 && ratingOneDecimal <= 2.7) return '2-5'
      if (ratingOneDecimal >= 2.8 && ratingOneDecimal <= 3.2) return '3'
      if (ratingOneDecimal >= 3.3 && ratingOneDecimal <= 3.7) return '3-5'
      if (ratingOneDecimal >= 3.8 && ratingOneDecimal <= 4.2) return '4'
      if (ratingOneDecimal >= 4.3 && ratingOneDecimal <= 4.7) return '4-5'
      if (ratingOneDecimal >= 4.8 && ratingOneDecimal <= 5) return '5'
    },

    buildProductCell: function (product) {
      function formatNumber(num) {
        var str = num.toFixed(2)
        var parts = str.split('.')
        var integer = parts[0]
        var decimal = parts[1]
        return integer.replace(/(\d)(?=(\d{3})+$)/g, '$1,') + (decimal ? '.' + decimal : '')
      }

      var itemImg = product.Image.ItemCellImageName
      var itemTitle = product.Description.Title.replaceAll('"', '&quot;')
      var price = product.UnitCost - product.InstantRebateAmount
      var dollarCent = formatNumber(price).split('.')
      var instock = product.Instock
      var productUrl = this.buildProductURL(product)
      var html = []

      html.push('<div class="swiper-slide">')
      html.push(
        '  <div class="item-container position-relative item-container-grid" data-itemnumber="' +
          product.Item +
          '">'
      )
      html.push('    <a href="' + productUrl + '" class="item-img" rel="nofollow">')
      html.push(
        '      <img src="https://c1.neweggimages.com/ProductImage/nb300/' +
          itemImg +
          '" title="' +
          itemTitle +
          '" alt="' +
          itemTitle +
          '">'
      )
      html.push('    </a>')
      html.push('    <div class="item-info">')
      if (product.Review && product.Review.Rating > 0) {
        html.push('      <div class="item-branding has-brand-store">')
        html.push(
          '        <a href="' +
            productUrl +
            '#IsFeedbackTab" class="goods-rating" title="Rating ' +
            product.Review.RatingOneDecimal +
            '" rel="nofollow">'
        )
        html.push(
          '          <i class="rating rating-' +
            this.getRatingEggs(product.Review.RatingOneDecimal) +
            '" aria-label="rated ' +
            product.Review.RatingOneDecimal +
            ' out of 5"></i>' +
            '<span class="goods-rating-num font-s text-gray">(' +
            product.Review.HumanRating +
            ')</span>'
        )
        html.push('        </a>')
        html.push('      </div>')
      }
      html.push(
        '      <a href="' +
          productUrl +
          '" class="item-title" title="View Details" rel="nofollow">' +
          itemTitle +
          '</a>'
      )
      if (product.PromotionInfo && product.PromotionInfo.DisplayPromotionText) {
        html.push(
          '      <p class="item-promo">' +
            product.PromotionInfo.DisplayPromotionText +
            '</p>'
        )
      }
      html.push('      <ul class="price">')
      if (instock) {
        if (product.InstantRebateAmount > 0) {
          html.push(
            '        <li class="price-was">$' + formatNumber(product.UnitCost) + '</li>'
          )
        }
        html.push('        <li class="price-current">')
        html.push(
          '          <span class="price-current-label"></span>$<strong>' +
            dollarCent[0] +
            '</strong><sup>.' +
            dollarCent[1] +
            '</sup>'
        )
        html.push('        </li>')
        if (product.InstantRebateAmount / product.UnitCost > 0.05) {
          html.push(
            '        <li class="price-save"><span class="price-save-label">Save: </span>' +
              '<span class="price-save-percent">' +
              (product.InstantRebateAmount / product.UnitCost * 100).toFixed(0) +
              '%</span></li>'
          )
        }
      }
      html.push('      </ul>')
      html.push(
        '<div class="item-operate">' +
          '<div class="item-button-area"><button class="btn btn-primary btn-mini" data-itemnumber="' +
          product.Item +
          '">Add to cart <i class="fas fa-caret-right"></i></button></div>' +
          '<div class="item-sponsored menu-box at-bottom">' +
          '<span>Sponsored </span>' +
          '<i class="fas fa-info-circle-light popover-question" data-toggle="popover" role="button" tabindex="0" aria-label="Sponsored ad information"></i>' +
          '<div class="item-sponsored-popover-content">' +
          '<div class="article">' +
          '<p>You\'re seeing this ad based on the product\'s relevance to your search query. If you are a seller and want to participate in this program click here to ' +
          '<a href="https://www.newegg.com/sellers/index.php/marketing-sponsored-product-ads/" class="link-blue">learn more</a>.</p>' +
          '</div></div>' +
          '</div>' +
          '</div>'
      )
      html.push('    </div>')
      html.push('  </div>')
      html.push('</div>')

      return html.join('')
    },
  }

  function sponsoredDataToMsg(row, index) {
    return {
      SearchKeyword: util.getUrlParam('d'),
      DetailItemNumber: row?.itemNumber,
      Position: index + 1,
      SponsoredGroupNumber: row?.adGroupNumber ?? '',
      SponsoredCampaignNumber: row?.campaignNumber ?? '',
      SponsoredType: row?.trackingTag ?? '',
      SponsoredMatchType: row?.matchType ?? '',
      SponsoredNormalizedKeyword: row?.normalizedKeyword ?? '',
    }
  }

  function buildSponsoredItemMap(rows) {
    return Object.fromEntries(
      rows.flatMap((r, i) => {
        const id = r?.itemNumber
        return id ? [[String(id), sponsoredDataToMsg(r, i)]] : []
      })
    )
  }

  function getSponsoredClickTrackingStr(currentRecommendItem) {
    const sm = currentRecommendItem?.SponsoredMsg
    const trigger = sm?.SearchKeyword ?? ''
    const itemId = currentRecommendItem?.Item
    const pos = sm?.Position ?? ''
    const spCid = sm?.SponsoredCampaignNumber ?? ''
    const spGid = sm?.SponsoredGroupNumber ?? ''
    const cmTag = sm?.SponsoredType ?? ''
    const spRpn = sm?.RelevantProductNumber ?? ''
    const spMt = sm?.SponsoredMatchType ?? ''
    return `Sponsored-_-KeywordSearchResult-_-${trigger}-_-${itemId}-_-:${pos}:${spCid}:${spGid}:${cmTag}+${spRpn}-_-${spMt}`
  }

  function AlsoLikeSponsored() {}
  AlsoLikeSponsored.prototype = {
    BASE_ORIGIN: location.origin || '',
    MODULE_TITLE: 'Products You May Also Like',
    PAGE_SIZE: 20,
    COUNTRY: __neweggState__.country.alpha3,
    MODULE_ID: 'plp_also_like_sponsored',
    TARGET_SELECTOR: '.page-content .row-body .list-wrap',

    _loadOnce: function () {
      var state = window.__plpAlsoLikeSponsoredState = window.__plpAlsoLikeSponsoredState || {}
      if (this._lazyLoaded || state.requested || jQuery('#' + this.MODULE_ID).length) return

      this._lazyLoaded = true
      state.requested = true
      this.render()
    },

    lazyRender: function () {
      var self = this
      var state = window.__plpAlsoLikeSponsoredState = window.__plpAlsoLikeSponsoredState || {}
      if (self._lazyLoaded || state.requested || jQuery('#' + self.MODULE_ID).length) return

      var $target = jQuery(self.TARGET_SELECTOR)
      if (!$target.length) {
        self._loadOnce()
        return
      }

      var anchorId = self.MODULE_ID + '_lazy_anchor'
      var $anchor = jQuery('#' + anchorId)
      if (!$anchor.length) {
        $anchor = jQuery('<div id="' + anchorId + '" aria-hidden="true"></div>').css({
          height: '1px',
          width: '1px',
          overflow: 'hidden',
        })
        $target.after($anchor)
      }

      util.useVisibilityOnce(
        $anchor.get(0),
        function () {
          $anchor.remove()
          self._loadOnce()
        },
        {
          rootMargin: '500px 0px 500px 0px',
        }
      )
    },

    render: function () {
      const keyword = util.getUrlParam('d')
      if (!keyword) return

      const sponsoredApiUrl =
        `${this.BASE_ORIGIN}/api/common/GetAlsoLikeSponsored?country=${this.COUNTRY}&keyword=${encodeURIComponent(keyword)}&size=${this.PAGE_SIZE}`

      jQuery.ajax({
        url: sponsoredApiUrl,
        type: 'GET',
        success: (response) => {
          response = util.parseJsonResponse(response)
          if (!response) return

          const data = response?.data ?? []
          if (!data.length) return

          const itemNumbers = data.map((row) => row.itemNumber).filter(Boolean)
          if (!itemNumbers.length) return

          const itemDetailUrl = `${this.BASE_ORIGIN}/api/ItemDetail?country=${this.COUNTRY}&ItemNumbers=${itemNumbers.join(',')}&inheritbase=true`

          jQuery.ajax({
            url: itemDetailUrl,
            type: 'GET',
            dataType: 'json',
            success: (items) => {
              items = util.parseJsonResponse(items)
              if (!items?.length) return

              const sponsoredByItem = buildSponsoredItemMap(data)
              items.forEach((d) => {
                const msg = sponsoredByItem[d.Item]
                if (msg) d.SponsoredMsg = msg
              })

              const products = items.filter(
                (item) =>
                  item.IsActivated && !item.IsBlockSeller && item.Instock && item.MapPrice == 0
              )
              if (!products.length) return
              this._renderModule(products)
            },
            error: (e) => console.error(e),
          })
        },
        error: (e) => console.error(e),
      })
    },

    _renderModule: function (products) {
      var self = this
      var itemsHtml = products.map(function (item) {
        return productCell.buildProductCell(item)
      }).join('')

      var html =
        self._buildStyle() +
        '<div class="product-similar-box" id="' + self.MODULE_ID + '">' +
        '  <div class="swiper-box-top">' +
        '    <div class="swiper-box-top-title"> ' + self.MODULE_TITLE + ' </div>' +
        '    <span class="swiper-box-sponsored-tag" aria-label="Sponsored">Sponsored</span>' +
        '  </div>' +
        '  <div class="tab-box">' +
        '    <div class="swiper-box responsive-5 similar_box">' +
        '      <div class="swiper-box-arrow-prev"><i class="fa fa-angle-left"></i></div>' +
        '      <div class="swiper-box-arrow-next"><i class="fa fa-angle-right"></i></div>' +
        '      <div class="swiper-container">' +
        '        <div class="swiper-wrapper">' +
        itemsHtml +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>'

      var $target = jQuery(self.TARGET_SELECTOR)
      if (!$target.length) return
      $target.after(html)

      const $mod = jQuery('#' + self.MODULE_ID)

      $mod.find('.swiper-slide .item-container').each(function () {
        var $card = jQuery(this)
        var itemnumber = $card.attr('data-itemnumber')
        var product = products.find(function (p) { return p.Item === itemnumber })
        if (!product) return

        util.useImpression($card.get(0), function () {
          util.sendGa4Fc('spa_view', {
            spa_value: getSponsoredClickTrackingStr(product),
          })
        })

        $card.find('a').on('click', function () {
          util.sendGa4Fc('spa_click', {
            spa_value: getSponsoredClickTrackingStr(product),
          })
        })
      })

      util.initPopper(function () {
        self._bindSponsoredItemPopovers($mod)
      })

      self._buildSwiper()

      jQuery('#' + self.MODULE_ID + ' .item-operate .btn-primary').on('click', function () {
        var itemnumber = jQuery(this).attr('data-itemnumber')
        window?.__ga_push({
          event: 'legacy_click',
          legacy_element_value: 'prodcut-manual_buytogether-addtocart',
          products: itemnumber,
        })
        location.href = 'http://secure.newegg.com/api/shop/add?ItemList=' + itemnumber
      })
    },

    /** shippingEstimate 里用 trigger:click 再靠 mouseenter 手动 show；此处仅 hover，用 manual 避免点击误触开关 */
    _bindSponsoredItemPopovers: function ($mod) {
      var $triggers = $mod.find('.item-sponsored .popover-question[data-toggle="popover"]')
      if (!$triggers.length) return
      if (typeof $triggers.popover !== 'function') return

      $triggers.popover({
        html: true,
        trigger: 'manual',
        animation: false,
        sanitize: false,
        container: 'body',
        placement: 'bottom',
        title: '',
        content: function () {
          return jQuery(this).closest('.item-sponsored').find('.item-sponsored-popover-content').html() || ''
        },
        template:
          '<div class="popover popover-sponsored-plp" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
      })

      $triggers
        .off('mouseenter.plpSponsoredPopover mouseleave.plpSponsoredPopover')
        .on('mouseenter.plpSponsoredPopover', function () {
          var el = this
          jQuery(this).popover('show')
          jQuery('.popover.popover-sponsored-plp')
            .off('mouseleave.plpSponsoredPopover')
            .on('mouseleave.plpSponsoredPopover', function () {
              jQuery('.popover.popover-sponsored-plp').removeClass('fade')
              jQuery(el).popover('hide')
            })
        })
        .on('mouseleave.plpSponsoredPopover', function () {
          var el = this
          setTimeout(function () {
            if (!jQuery('.popover.popover-sponsored-plp:hover').length) {
              jQuery('.popover.popover-sponsored-plp').removeClass('fade')
              jQuery(el).popover('hide')
            }
          }, 300)
        })
    },

    _buildSwiper: function () {
      var self = this
      var getSlidesPerView = function () {
        var w = jQuery(document).width()
        if (w < 1199) return 3
        if (w < 1299) return 4
        return 5
      }

      $.cachedScript(
        'https://c1.neweggimages.com/webresource/Scripts/plugin/swiper-bundle.6.7.1.min.js'
      ).done(function () {
        var spv = getSlidesPerView()
        var swiper = new Swiper('#' + self.MODULE_ID + ' .swiper-box .swiper-container', {
          navigation: {
            prevEl: '#' + self.MODULE_ID + ' .swiper-box .swiper-box-arrow-prev',
            nextEl: '#' + self.MODULE_ID + ' .swiper-box .swiper-box-arrow-next',
          },
          slidesPerView: spv,
          slidesPerGroup: spv,
          spaceBetween: 0,
          watchOverflow: true,
          autoHeight: false,
          freeMode: false,
        })

        window.addEventListener('resize', function () {
          var n = getSlidesPerView()
          swiper.params.slidesPerView = n
          swiper.params.slidesPerGroup = n
          swiper.update()
        })
      })
    },

    _buildStyle: function () {
      return (
        '<style>' +
        '#plp_also_like_sponsored { margin: 40px 0; }' +
        '#plp_also_like_sponsored .swiper-box-top {' +
        '  display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px;' +
        '}' +
        '#plp_also_like_sponsored .swiper-box-top::before,' +
        '#plp_also_like_sponsored .swiper-box-top::after {' +
        '  content: none !important; display: none !important;' +
        '}' +
        '#plp_also_like_sponsored .swiper-box-top-title {' +
        '  display: block; font: 400 32px "Open Sans Condensed", "Helvetica Narrow", arial, helvetica, sans-serif;' +
        '  text-transform: uppercase; letter-spacing: 1px; color: #222; margin: 0; flex: 0 1 auto; min-width: 0;' +
        '}' +
        '.dark-mode #plp_also_like_sponsored .swiper-box-top-title { color: #e3e3e3; }' +
        '#plp_also_like_sponsored .swiper-box-sponsored-tag {' +
        '  flex-shrink: 0;' +
        '  color: #666; padding: 6px 10px;' +
        '}' +
        '.dark-mode #plp_also_like_sponsored .swiper-box-sponsored-tag { color: #aaa; border-color: #555; background: #2a2a2a; }' +
        '#plp_also_like_sponsored .swiper-box .swiper-slide { flex-basis: calc(100% / 5); }' +
        '@media (max-width: 1299px) { #plp_also_like_sponsored .swiper-box .swiper-slide { flex-basis: calc(100% / 4); } }' +
        '@media (max-width: 1199px) { #plp_also_like_sponsored .swiper-box .swiper-slide { flex-basis: calc(100% / 3); } }' +
        '#plp_also_like_sponsored .swiper-box-arrow-prev.swiper-button-disabled,' +
        '#plp_also_like_sponsored .swiper-box-arrow-next.swiper-button-disabled { display: none !important; }' +
        '#plp_also_like_sponsored .item-sponsored-popover-content { display: none !important; }' +
        '.popover.popover-sponsored-plp .popover-header { display: none; padding: 0; margin: 0; border: 0; height: 0; overflow: hidden; }' +
        '.popover.popover-sponsored-plp .popover-body { text-align: left; max-width: 320px; }' +
        '</style>'
      )
    },
  }

  $(function () {
    try {
      if (!$.cachedScript) {
        $.cachedScript = function (url, options) {
          options = $.extend(options || {}, {
            dataType: 'script',
            cache: true,
            url: url,
          })
          return $.ajax(options)
        }
      }
      new AlsoLikeSponsored().lazyRender()
    } catch (e) {
      console.error(e)
    }
  })
})()
