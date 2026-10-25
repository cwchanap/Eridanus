import type { Messages } from './en';

// Traditional Chinese. Written by the author, not yet read by a native
// speaker. Terms used throughout: keeper 守塔人, sigil/crest 徽記, ledger
// 記錄冊, Restoration Core 修復核心, tower heart 塔心.
export const zhHant: Messages = {
  ui: {
    playerStatus: '玩家狀態',
    hero: '勇者',
    items: '道具',
    noItems: '目前還沒有找到任何東西。',
    location: '所在位置',
    messages: '訊息',
    explore: '探索吧。走向任何東西，就能與它互動。',
    closeMessage: '關閉訊息',
    enemy: '敵人',
    combat: '戰鬥',
    hpLoss: (loss) => `HP 損失：${loss}`,
    leavesYouAt: (hp, maxHp) => `戰後剩下 ${hp}/${maxHp}`,
    fight: '戰鬥',
    cancel: '取消',
    shop: '商店',
    price: (price) => `價格：${price} 金幣`,
    youHave: (gold) => `你有 ${gold}`,
    leavesYou: (gold) => `購買後剩下 ${gold}`,
    buy: '購買',
    leave: '離開',
    invalidSave: '無效的存檔',
    invalidSaveTitle: '存檔資料無效。',
    invalidSaveBody: '此瀏覽器中的存檔無法載入。請重設存檔，開始新的冒險。',
    resetSave: '重設存檔',
    journal: '日誌',
    sideLeads: '支線線索',
    notes: '筆記',
    placesFound: '已發現的地點',
    show: '展開',
    hide: '收合',
    mute: '靜音',
    unmute: '取消靜音',
    language: '語言',
  },
  howToPlay: {
    title: '遊戲說明',
    move: '移動一格。',
    interact: '走向人物、寶箱、門與樓梯，就能互動或使用。',
    fight: (enter, esc) =>
      `戰鬥前會先顯示確切的 HP 損失：按 ${enter} 開戰，按 ${esc} 退開。`,
    autosave: '進度會自動儲存。',
    tip: '先去和身穿青綠斗篷的守望長談談吧。',
  },
  statLabels: {
    hp: 'HP',
    attack: '攻擊',
    defense: '防禦',
    gold: '金幣',
    maxHp: '最大 HP',
  },
  statNames: {
    attack: '攻擊力',
    defense: '防禦力',
    maxHp: '最大 HP',
  },
  tags: {
    clue: '線索',
    powerUp: '能力提升',
    restored: '恢復',
    shortcut: '捷徑',
    sealed: '封鎖',
    victory: '勝利',
    purchased: '已購買',
    item: '道具',
    lever: '拉桿',
  },
  effects: {
    statUp: (stat, amount) => `${stat}提升了 ${amount}。`,
    healed: (hp) => `HP 已恢復至 ${hp}。`,
    latchOpened: '門閂打開了。這條捷徑現在可以從兩側通行。',
    latchGuarded: (remaining) =>
      `守衛把這道門閂鎖得死死的。再擊敗 ${remaining} 名守衛才能打開。`,
    latchWired: (thrown, total) =>
      `這道活門連著 ${total} 根拉桿，只有全部拉下時才會打開。目前已拉下 ${thrown}／${total} 根。`,
    leverPulled: (thrown, linked) =>
      `${thrown ? '你把拉桿拉了下來。' : '你把拉桿推了回去。'}${
        linked === 0
          ? ''
          : linked === 1
            ? '另一根拉桿也跟著動了。'
            : `另外 ${linked} 根拉桿也跟著動了。`
      }`,
    victory: (hpLost, gold) =>
      `敵人已被擊敗。損失 HP：${hpLost}。${gold > 0 ? `獲得金幣：${gold}。` : ''}`,
    purchased: (item, stat, amount) => `${item}：${stat}提升了 ${amount}。`,
    soldOut: '賣完了。我做的東西你全都買走啦。',
    obtained: (item) => `獲得了${item}。`,
  },
  reasons: {
    wall: '前方是牆壁，過不去。',
    'out-of-bounds': '那個方向走不通。',
    'interaction-pending': '請先完成目前的互動。',
    'latch-closed-front': '這道門閂只能從另一側打開。',
    'combat-unwinnable': '你的攻擊無法對這個敵人造成傷害。',
    'combat-lethal': '這場戰鬥會讓你倒下。',
    'reward-already-taken': '這份獎勵已經領取過了。',
    'not-enough-gold': '你的金幣還不夠。',
  },
  enemies: {
    'enemy-ruin-guard': '遺跡守衛',
    'enemy-ruin-sentinel': '遺跡哨兵',
    'enemy-core-guardian': '核心守護者',
  },
  leadTitles: {
    main: '主線任務',
    heirloom: '傳家寶',
    route: '失落路徑',
    ledger: '守塔人記錄冊',
  },
  leads: {
    'seek-warden': '去和村莊的守望長談談。',
    'find-sigil': '到第 1 層尋找可重複使用的塔之徽記。',
    descend: '徽記能打開通往下層的樓梯。前往第 2 層。',
    'search-floor2': '通往下層的樓梯已經敞開。到第 2 層尋找失蹤者。',
    'investigate-deeper': '失蹤者帶回了第 2 層以下的傳聞。繼續深入調查。',
    'heirloom-find-workshop': '尋找被封起來的工坊寶庫。',
    'heirloom-inspect-treasury': '想辦法查看那座看得見的寶庫入口。',
    'heirloom-find-other-entrance':
      '看得見的入口已被封死。尋找從下方通往寶庫的另一個入口。',
    'heirloom-claim-treasury':
      '有一道隱藏的樓梯能從下方通往寶庫。去取回工坊的傳家寶。',
    'heirloom-resolved': '工坊的傳家寶已經尋回。',
    'route-find-marks': '尋找古老的路線刮痕。',
    'route-verify-return': '查明刻有記號的回返通道通往何處。',
    'route-resolved': '回返通道已獲證實。古老的路線確實存在。',
    'ledger-find-fragment': '尋找倖存的守塔人記錄冊殘頁。',
    'ledger-find-later-pages': '到塔的更深處尋找後面的記錄頁。',
    'ledger-follow-deeper-record':
      '成對的守衛機關解釋了這份殘頁。到塔的更深處尋找最終記錄。',
    'reach-heart-chamber':
      '下層的塔已經開通。拉下連著第 3 層活門的三根拉桿，一路殺到第 5 層的塔心。',
    'claim-restoration-core': '核心守護者已被擊敗。取回修復核心。',
    'return-restoration-core': '把修復核心帶回給村莊的守望長。',
    'story-complete': '修復核心已回到村莊。這座塔可以修復了。',
    'ledger-resolved': '守塔人的最終記錄解釋了守護者隔離故障的來龍去脈。',
  },
  maps: {
    village: '起始村莊',
    floor1: '高塔 第 1 層',
    floor2: '高塔 第 2 層',
    floor3: '高塔 第 3 層',
    floor4: '高塔 第 4 層',
    floor5: '高塔 第 5 層',
  },
  sections: {
    'village-square': '村莊廣場',
    'village-market': '市集街',
    'village-tower-road': '高塔之路',
    'village-mine-trail': '礦坑小徑',
    'village-crypt-lane': '墓窖巷',
    'village-barrow-path': '古墓小徑',
    'floor1-entry-court': '入口中庭',
    'floor1-west-passages': '西側通道',
    'floor1-upper-gallery': '上層長廊',
    'floor1-sigil-vault': '徽記金庫',
    'floor1-rear-wing': '後棟',
    'floor1-workshop-treasury': '工坊寶庫',
    'floor2-front-landing': '前方平台',
    'floor2-service-corridor': '雜務通道',
    'floor2-reading-room': '封閉的閱覽室',
    'floor2-reading-room-loft': '閱覽室閣樓',
    'floor2-east-service': '東側雜務棟',
    'floor2-central-hall': '中央大廳',
    'floor2-west-archive': '西側檔案室',
    'floor3-spine': '脊廊',
    'floor3-north-passage': '北側通道',
    'floor3-hidden-vault': '隱藏金庫',
    'floor3-heart': '塔心前廊',
    'floor3-keeper-archive': '守塔人檔案室',
    'floor3-galleries': '南側長廊',
    'floor3-undercroft': '地下墓室',
    'floor3-west-crypt-walk': '西側墓道',
    'floor3-east-crypt-walk': '東側墓道',
    'floor4-stair-landing': '階梯平台',
    'floor4-west-works': '西側作業區',
    'floor4-east-works': '東側作業區',
    'floor4-forge': '鍛造爐',
    'floor4-casting-gallery': '鑄造長廊',
    'floor4-slag-cellar': '熔渣地窖',
    'floor4-west-flues': '西側煙道',
    'floor4-east-flues': '東側煙道',
    'floor5-landing': '下方平台',
    'floor5-west-ring': '西環',
    'floor5-north-ring': '北環',
    'floor5-east-ring': '東環',
    'floor5-south-ring': '南環',
    'floor5-inner-ring': '內環',
    'floor5-sanctum': '聖所',
    'floor5-old-shaft': '舊豎井',
  },
  npcs: {
    'village-warden': '守望長',
    'village-artisan': '工匠',
    'village-scout': '斥候',
    'village-scribe': '抄寫員',
    'village-returned-subject': '歸來者',
    'village-elder': '長老',
    'village-guard': '衛兵',
    'village-child': '孩童',
    'floor2-missing-subject': '失蹤者',
  },
  shops: {
    'village-weapon-shop': '鐵匠',
    'village-armor-shop': '甲冑匠',
    'village-item-shop': '商人',
  },
  items: {
    'iron-sword': '鐵劍',
    'steel-sword': '鋼劍',
    'runed-blade': '符文之刃',
    'leather-vest': '皮背心',
    'chain-mail': '鎖子甲',
    'plate-armor': '板甲',
    'vitality-charm': '活力護符',
    'heart-amulet': '心之護符',
    'life-crystal': '生命水晶',
    'ledger-fragment-1': '記錄冊殘頁',
    'tower-depth-sigil': '塔之徽記',
    'tower-restoration-core': '修復核心',
  },
  clues: {
    'floor1-treasury-overlook':
      '正對著那座看得見的寶庫的拱門，從這一側被磚封住了。',
    'floor1-route-mark': '刮痕指向一條從下方回返的通道。',
    'floor1-gallery-tally':
      '牆上滿是計日的刻痕，下方寫著：「第九天。看守們再也不讓我們通過了。誰找到塔之徽記，就把它帶下去：下層的階梯還認得它的形狀。」',
    'floor1-rear-note':
      '石縫裡塞著一張紙條：「動力核心還是溫的。把它帶下去：守著檔案室機關的哨兵擋不住它。」',
    'floor2-paired-release-ledger':
      '一本攤開的守塔人記錄冊寫道：「大廳的兩道機關是成對的。兩者都聽命於駐守在雜務棟的哨兵——只要它還站著，兩道門都不會鬆動。」',
    'floor2-hall-notice':
      '書架上釘著一張告示：「奉守塔人之命，在下去的那個人回來之前，通往下層的封印一律保持關閉。」',
    'floor2-index-card':
      '一張撕破的索引卡：「寶庫階梯，最後一條走道。駐守那裡的蠻兵不聽任何守塔人的命令。」',
    'floor2-reading-room-glimpse':
      '從書架底部的縫隙往下望，可以瞥見一間點著燈的閱覽室。這一側沒有門。守塔人潦草寫著：「舊豎井從塔心一路通到那裡。」',
    'floor2-reading-room-index':
      '閱覽室的目錄只列了一個書架：「守塔人的武具，留給從塔心爬上舊豎井的人。」',
    'floor3-vault-route-mark':
      '古老的路線刮痕在這裡重複出現，但有一道刻痕轉向西側的牆，而不是通往塔心。',
    'floor3-crypt-crack':
      '牆上的裂縫後方，是一座四面封死的墓室。遠端有一道階梯通往上方，但沒有任何門通往這一層。',
    'floor3-keeper-final-record':
      '守塔人最終記錄：成對的機關隔離了一次守護者控制故障。隔離維持住了，卻沒有人回來解除；塔的能流依舊持續供應村莊，直到核心開始衰竭。',
    'floor3-hatch-diagram':
      '書架上釘著一張線路圖：塔心的活門連著三根拉桿，分別在西側支道的盡頭、最後一條長廊的盡頭，以及這座檔案室的頂端。只有三根全部拉下時，活門才會打開。',
    'floor3-heart-lockdown-record':
      '守塔人刻下了最後的警告：守護格網仍在守衛著兩層樓之下、真正塔心裡的隔離狀態。擊破停擺的守護者，取回修復核心，並在塔的能流徹底衰竭之前把它送回村莊。',
    'floor3-shaft-record':
      '壁龕上刻著：「守塔人的豎井從塔心通往閱覽室。除了兩端的活門，我們封死了每一扇門。」',
    'floor4-landing-scratches':
      '階梯旁有刻痕：「塔心就在下一層。鍛造爐的看守把守著通往鑄造門的豎井。兩名工頭各在一處作業區守著鋼材，沒有那些鋼，誰也過不了他那一關。」',
    'floor4-linkage-note':
      '裝配工的筆記：「鑄造門的四根拉桿共用一套老舊的連動機構。拉下其中一根，相鄰的拉桿也會跟著跳動。只有四根全部拉下時，門才會打開。」',
    'floor4-cellar-crack':
      '從煙道牆上的裂縫，可以看見熔渣地窖：一座四面封死的螺旋迴廊，中心有一道階梯。這一層沒有任何入口通往那裡。',
    'floor4-foundry-ledger':
      '一本鑄造場帳簿：「舊金庫的階梯從西側倉庫往上延伸。那座倉庫要有人看守。」',
    'floor4-shaft-scrawl':
      '煙道牆上有守塔人的潦草字跡：舊豎井從五樓西側金庫的活門出發（那裡由兩名金庫守衛把守），穿過這座地窖與上方的墓室，一路通到二樓的閱覽室。',
    'floor5-seal-inscription':
      '階梯旁有刻痕：「三名看守分別在西、南、東守護聖所的封印。只要其中任何一人還站著，塔心就始終緊閉。」',
    'floor5-lattice-record':
      '守護格網仍迴盪著古老的隔離指令。格網後方，修復核心靜靜躺在一座失去動力的升降井上方。',
  },
  access: {
    'village-lift-to-floor5':
      '一座升降籠癱在井道中，動彈不得。它的插槽正好嵌得下一顆動力核心。',
    'village-mine-entrance': '倒塌的木樑堵住了舊礦坑的入口。目前無法進入。',
    'village-crypt-entrance':
      '一道鐵柵擋住了墓窖的階梯，鎖已鏽死。目前無法進入。',
    'village-barrow-entrance':
      '一塊巨石橫在古墓口，怎麼推也推不動。目前無法進入。',
    'floor1-front-to-floor2': '一個徽記形狀的插槽封住了通往下層的樓梯。',
    'floor2-depth-to-floor3':
      '下層的守塔人封印不會鬆動，除非失蹤者帶著來自下方的警告回來。',
    'floor5-lift-to-village':
      '升降籠癱在原地。它的插槽正好嵌得下一顆動力核心。',
  },
  notes: {
    'village-tower-stairs-used': '階梯連接著村莊與第 1 層。',
    'floor1-treasury-seen': '從入口中庭可以看見一座被封起來的寶庫。',
    'floor1-treasury-sealed': '寶庫的拱門從這一側被磚封住了。',
    'floor1-route-mark-seen': '路線刮痕指向一條從下方回返的通道。',
    'floor1-depth-seal-seen': '一個徽記形狀的插槽封住了通往下層的樓梯。',
    'floor1-depth-stairs-used': '下層的樓梯通往第 2 層。',
    'floor1-rear-stairs-used': '第二道樓梯回到後棟。',
    'floor1-treasury-return-used':
      '寶庫後方有一道隱藏的樓梯通往第 2 層——被封住的寶庫可以從後面進入。',
    'floor2-paired-release-ledger-read':
      '守塔人把兩道大廳機關設為成對：在雜務棟的哨兵倒下之前，兩者都不會開啟。',
    'floor2-depth-seal-seen':
      '在失蹤者帶著守塔人的警告回來之前，下層的封印不會鬆動。',
    'floor2-depth-stairs-used': '被封住的下層樓梯通往第 3 層。',
    'floor3-keeper-final-record-read':
      '守塔人的最終記錄寫道，成對的機關隔離了一次失效的守護者控制狀態，而塔仍持續向村莊系統供能。',
    'floor3-depth-stairs-used': '塔心哨兵身後的樓梯通往第 4 層。',
    'floor4-depth-stairs-used': '鑄造場的樓梯通往第 5 層，也就是塔心。',
    'tower-lift-seen':
      '一座報廢的升降籠連接著村莊與塔心。它的插槽是為動力核心打造的。',
  },
  dialogue: {
    'warden-main-lead': '到第一層去找能打開下層樓梯的徽記吧。',
    'warden-sigil-found':
      '那枚徽記和下層的封印吻合。通往下一層的樓梯現在應該打得開了。',
    'artisan-find-workshop': '我家的工坊被封在塔裡了。去找找它的寶庫吧。',
    'artisan-workshop-seen':
      '你從入口那一側看到了工坊的寶庫。想辦法再靠近一點。',
    'artisan-find-other-entrance':
      '這一側的拱門被磚封死了。一定還有另一個入口，在下面。',
    'scout-find-marks':
      '一張舊圖紙上畫著一條不該存在的回返通道。留意路上的刮痕。',
    'scout-marks-seen': '那些刮痕和舊圖紙吻合。這條路八成是從下方接回來的。',
    'scribe-find-ledger':
      '守塔人把每一道機關都記錄下來了。找到記錄冊殘頁的話，帶回來給我。',
    'scribe-fragment-found':
      '這份殘頁提到了成對的機關。塔的更深處一定還留著其他頁。',
    'warden-subject-returned':
      '你把他們平安帶回來了。可是後方長廊底下那扇被封住的門——門後的東西不能再等了。',
    'subject-returning':
      '我可以自己回村莊。告訴守望長我平安無事——還有，下面仍有東西在等著。',
    'subject-village':
      '我平安回家了，但我在後方長廊底下看到的東西，至今仍揮之不去。總得有人再深入調查。',
    'artisan-treasury-route-found':
      '有一道隱藏的樓梯能從下方通到寶庫？去吧——我家的傳家寶終於能取回了。',
    'artisan-heirloom-recovered':
      '工坊的傳家寶終於尋回了。我們全家都感謝你，探險者。',
    'scout-route-verified':
      '這麼說，那條回返的通道是真的。舊圖紙果然沒錯——失落的路線證實了。',
    'scribe-floor2-ledger-read':
      '成對的守衛機關——原來殘頁指的是這個。守塔人的最終記錄一定在塔的更深處。',
    'warden-restoration-ending':
      '修復核心能重啟為我們村莊供應補給的塔內能流。守護者的封鎖已經解除，我們終於可以修復這套系統了。',
    'warden-restoration-ending-ledger':
      '修復核心能重啟村莊的補給。守塔人的記錄也說明了故障的原因：成對的機關隔離了一次守護者控制故障，但隔離從未被解除。我們能在真相完整的情況下修復這套系統。',
    'scribe-final-ledger-read':
      '那份最終記錄為記錄冊畫下了句點。守護者們被困在緊急隔離狀態裡，而村莊依賴的，正是它們所守衛的同一套系統。',
    'elder-sealed-crypt':
      '東邊山丘下的墓窖，在我出生之前就封住了。總有一天得有人把它打開，但不是今天。',
    'guard-sealed-mine': '舊礦坑多年前就塌了。在坑道補強好之前，沒有人會下去。',
    'child-gold-tip':
      '打倒塔裡的守衛會掉金幣喔！市集街的商店可以用金幣換裝備。',
  },
};
