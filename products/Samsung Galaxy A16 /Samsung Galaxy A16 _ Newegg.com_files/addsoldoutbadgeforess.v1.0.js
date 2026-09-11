;jQuery(function () {
  'use strict'


  const PAGE_CONFIGS = {
    EventSaleStore: {
      getDataSource: () => {
        return window.__initialState__?.ProductDeals || []
      },
      getExtraData: () => {
        return window.__initialState__?.extraDeals || []
      },
      containerSelector: '#Product_List',
      itemContainerSelector: '[data-itemnumber]',
      imageSelector: 'a.goods-img',
      needsMutationObserver: () => window.__initialState__?.StaticTemplateId === 2,
      getItemNumber: element => {
        if (!element) return null
        if (element.hasAttribute && element.hasAttribute('data-itemnumber')) {
          return element.getAttribute('data-itemnumber')
        }
        return null
      },
      getItemElement: (containers, itemNumber) => {
        for (const container of containers) {
          let element = container.querySelector(
            `[data-itemnumber="${itemNumber}"]`
          )
          if (element) return element
        }
        return null
      }
    },
    ProductList: {
      getDataSource: () => {
        return window.__initialState__?.Products || []
      },
      getExtraData: () => {
        return []
      },
      containerSelector: '.item-cells-wrap, .items-list-view',
      itemContainerSelector: '.item-cell',
      imageSelector: '.item-container .item-img',
      needsMutationObserver: () => false,
      getItemNumber: element => {
        if (!element) return null
        const stockElement = element.querySelector('[id^="stock_"]')
        if (stockElement && stockElement.id) {
          return stockElement.id.replace('stock_', '')
        }
        return null
      },
      getItemElement: (containers, itemNumber) => {
        for (const container of containers) {
          const stockElement = container.querySelector(`[id="stock_${itemNumber}"]`)
          if (stockElement) {
            const itemCell = stockElement.closest('.item-cell')
            if (itemCell) return itemCell
          }
        }
        return null
      }
    }
  }

  function detectPageType() {
    if (["ProductList", "SubCategory", "BrandSubCat"].includes(window.__pageInfo__?.routeName)) {
      return 'ProductList'
    }else if (window.__pageInfo__?.routeName === "EventSaleStore") {
      return "EventSaleStore"
    }
    return null
  }

  const currentPageType = detectPageType()
  if (!currentPageType) return
  const config = PAGE_CONFIGS[currentPageType]

  const style = document.createElement('style')
  style.textContent = `
    .doorbust-tag {
      background-color: rgba(0, 0, 0, 0.6);
      padding: 3px 10px;
      box-sizing: border-box;
      border-radius: 4px;
      position: absolute;
      left: 10px;
      bottom: 10px;
      font-size: 14px;
      font-weight: 900;
      color: #FF4848;
    }
    .doorbust-tag span {
      font-style: italic;
    }
    @media (max-width: 999px) {
      .doorbust-tag {
        font-size: 12px;
        left: 5px;
        bottom: 5px;
      }
    }
    @media (max-width: 599px) {
      .doorbust-tag {
        font-size: 12px;
        padding-right: 30px;
      }
    }
    @media (max-width: 399px) {
      .doorbust-tag {
        font-size: 10px;
        line-height: 14px;
      }
    }
  `
  document.head.appendChild(style)

  const processedItems = new Set()
  let mutationObserverRetryCount = 0
  const MAX_MUTATION_OBSERVER_RETRY = 10

  async function getGroupBuyEnrollStatus(transactionId) {
    try {
      const response = await fetch('/product/api/GetGroupBuyEnrollStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          GroupBuyTransactionID: transactionId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching GroupBuy status:', error)
      return null
    }
  }

  function isSoldout(enrollStatus, itemDetail) {
    if (!enrollStatus || !itemDetail) return false

    const enrolleeCount = enrollStatus?.EnrolleeCount || 0
    const maxGroupNumber = itemDetail?.GroupBuy?.MaxGroupNumber || 0

    return enrolleeCount >= maxGroupNumber || !itemDetail?.Instock
  }

  function addSoldoutBadge(itemNumber) {
    const containers = document.querySelectorAll(config.containerSelector)
    if (!containers || containers.length === 0) return

    let itemElement = config.getItemElement(containers, itemNumber)

    if (!itemElement) return

    if (itemElement.querySelector('.doorbust-tag')) return

    const goodsImage = itemElement.querySelector(config.imageSelector)
    if (!goodsImage) return

    const doorbustTag = document.createElement('div')
    doorbustTag.className = 'doorbust-tag'
    doorbustTag.innerHTML = '<span>Doorbuster Deal: Sold Out</span>'

    goodsImage.appendChild(doorbustTag)
  }

  async function processItem(item) {
    const itemNumber = item.Item
    const transactionId = item.GroupBuy?.GroupBuyTransactionID

    if (processedItems.has(itemNumber)) return

    processedItems.add(itemNumber)

    if (!transactionId) return

    const enrollStatus = await getGroupBuyEnrollStatus(transactionId)

    if (isSoldout(enrollStatus, item)) {
      addSoldoutBadge(itemNumber)
    }
  }

  function processBusterDealItems() {
    try {
      const dataSource = config.getDataSource()

      if (!Array.isArray(dataSource)) return

      const busterDealItems = dataSource?.filter(item => {
        const itemCell = item?.ItemCell
        if (!itemCell) return false
        return itemCell?.GroupBuy?.FlowType === 3
      })

      busterDealItems.forEach(item => {
        let itemToProcess = null

        if (item?.ItemCell) {
          itemToProcess = item.ItemCell
        } else if (item?.Item && item?.GroupBuy) {
          itemToProcess = item
        }

        if (itemToProcess) {
          processItem(itemToProcess)
        }
      })
    } catch (error) {
      console.error('Error processing busterdeal items:', error)
    }
  }

  function findItemByNumber(itemNumber) {
    const mainData = config.getDataSource()
    const extraData = config.getExtraData()

    const deal = [].concat(mainData, extraData)?.find(i => {
      const item = i?.ItemCell || i
      return (
        item?.Item === itemNumber && 
        item?.GroupBuy?.FlowType === 3
      )
    })

    return deal?.ItemCell || deal || null
  }

  function processNewItems(addedNodes) {
    addedNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return

      const nodeItemNumber = config.getItemNumber(node)
      if (nodeItemNumber) {
        const item = findItemByNumber(nodeItemNumber)
        if (item) {
          processItem(item)
        }
      }

      if (node.querySelectorAll) {
        const itemElements = node.querySelectorAll(config.itemContainerSelector)
        itemElements.forEach(element => {
          const itemNumber = config.getItemNumber(element)
          if (itemNumber) {
            const item = findItemByNumber(itemNumber)
            if (item) {
              processItem(item)
            }
          }
        })
      }
    })
  }

  function setupMutationObserver() {
    const containers = document.querySelectorAll(config.containerSelector)

    if (!containers || containers.length === 0) {
      mutationObserverRetryCount++

      if (mutationObserverRetryCount >= MAX_MUTATION_OBSERVER_RETRY) {
        return
      }

      setTimeout(setupMutationObserver, 1000)
      return
    }

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          processNewItems(mutation.addedNodes)
        }
      })
    })

    containers.forEach(container => {
      observer.observe(container, {
        childList: true,
        subtree: true
      })
    })
  }

  function init() {
    processBusterDealItems()
  
    if (config.needsMutationObserver()) {
      setupMutationObserver()
    }
  }

  init()
})
