import type { Messages } from './en';

// Japanese. Written by the author, not yet read by a native speaker. Terms
// used throughout: keeper 管理人, sigil/crest 紋章, ledger 記録簿,
// Restoration Core 復元コア, tower heart 塔の心臓部.
export const ja: Messages = {
  ui: {
    playerStatus: 'ステータス',
    hero: '勇者',
    items: '持ち物',
    noItems: 'まだ何も見つけていない。',
    location: '現在地',
    messages: 'メッセージ',
    explore:
      '探索しよう。気になるものに向かって歩くと、調べたり話したりできる。',
    closeMessage: 'メッセージを閉じる',
    enemy: '敵',
    combat: '戦闘',
    hpLoss: (loss) => `失うHP：${loss}`,
    leavesYouAt: (hp, maxHp) => `戦闘後 ${hp}/${maxHp}`,
    fight: '戦う',
    cancel: 'やめる',
    shop: 'お店',
    price: (price) => `価格：${price}ゴールド`,
    youHave: (gold) => `所持：${gold}`,
    leavesYou: (gold) => `購入後：${gold}`,
    buy: '買う',
    leave: '立ち去る',
    invalidSave: '無効なセーブ',
    invalidSaveTitle: 'セーブデータが無効です。',
    invalidSaveBody:
      'このブラウザに保存された記録は読み込めません。リセットして新しく始めてください。',
    resetSave: 'セーブをリセット',
    journal: '日誌',
    sideLeads: 'サブの手がかり',
    notes: 'メモ',
    placesFound: '見つけた場所',
    show: '開く',
    hide: '閉じる',
    mute: '音を消す',
    unmute: '音を出す',
    language: '言語',
  },
  howToPlay: {
    title: '遊び方',
    move: '1マス移動する。',
    interact: '人や宝箱、門、階段に向かって歩くと、話したり使ったりできる。',
    fight: (enter, esc) =>
      `戦闘の前に、失うHPが正確に表示される。${enter}で戦い、${esc}でやめる。`,
    autosave: '進行状況は自動で保存される。',
    tip: 'まずは青緑のマントを着た守衛長に話しかけてみよう。',
  },
  statLabels: {
    hp: 'HP',
    attack: '攻撃',
    defense: '防御',
    gold: 'ゴールド',
    maxHp: '最大HP',
  },
  statNames: {
    attack: '攻撃力',
    defense: '防御力',
    maxHp: '最大HP',
  },
  tags: {
    clue: '手がかり',
    powerUp: 'パワーアップ',
    restored: '回復',
    shortcut: '近道',
    sealed: '封鎖',
    victory: '勝利',
    purchased: '購入',
    item: 'アイテム',
  },
  effects: {
    statUp: (stat, amount) => `${stat}が${amount}上がった。`,
    healed: (hp) => `HPが${hp}まで回復した。`,
    latchOpened: 'かんぬきが外れた。この近道は両側から通れるようになった。',
    latchGuarded: (remaining) =>
      `衛兵がこのかんぬきを閉ざしている。あと${remaining}体倒すと開く。`,
    victory: (hpLost, gold) =>
      `敵を倒した。失ったHP：${hpLost}。${gold > 0 ? `獲得ゴールド：${gold}。` : ''}`,
    purchased: (item, stat, amount) => `${item}：${stat}が${amount}上がった。`,
    soldOut: '売り切れだよ。うちの品はもう全部持っているね。',
    obtained: (item) => `${item}を手に入れた。`,
  },
  reasons: {
    wall: '壁に阻まれて進めない。',
    'out-of-bounds': 'そちらへは行けない。',
    'interaction-pending': '先に今のやり取りを終わらせよう。',
    'latch-closed-front': 'このかんぬきは反対側からしか開かない。',
    'combat-unwinnable': '今の攻撃力では、この敵にダメージを与えられない。',
    'combat-lethal': 'この戦いでは倒されてしまう。',
    'reward-already-taken': 'この報酬はすでに受け取っている。',
    'not-enough-gold': 'ゴールドがまだ足りない。',
  },
  enemies: {
    'enemy-ruin-guard': '遺跡の衛兵',
    'enemy-ruin-sentinel': '遺跡の歩哨',
    'enemy-core-guardian': 'コアの守護者',
  },
  leadTitles: {
    main: 'メインクエスト',
    heirloom: '家宝',
    route: '失われた経路',
    ledger: '管理人の記録簿',
  },
  leads: {
    'seek-warden': '村の守衛長に話を聞く。',
    'find-sigil': '1階で、再利用できる塔の紋章を探す。',
    descend: '紋章で下への階段が開く。2階へ降りよう。',
    'search-floor2': '下への階段が開いた。2階で行方不明の人を探そう。',
    'investigate-deeper':
      '帰ってきた行方不明者が、2階の下にあるものについて語った。さらに奥を調べよう。',
    'heirloom-find-workshop': '封じられた工房の宝物庫を探す。',
    'heirloom-inspect-treasury': '見えている宝物庫への道を調べる方法を探す。',
    'heirloom-find-other-entrance':
      '見えている入口は塞がれている。下から入れる別の入口を探そう。',
    'heirloom-claim-treasury':
      '隠された階段が下から宝物庫へ通じている。工房の家宝を取り戻そう。',
    'heirloom-resolved': '工房の家宝を取り戻した。',
    'route-find-marks': '古い経路の引っかき傷を探す。',
    'route-verify-return': '印のついた帰り道がどこへ通じているか確かめる。',
    'route-resolved': '帰り道が確認できた。古い経路は実在した。',
    'ledger-find-fragment': '残っている管理人の記録簿の断片を探す。',
    'ledger-find-later-pages': '塔のさらに奥で、続きのページを探す。',
    'ledger-follow-deeper-record':
      '対になった解放装置が断片の意味を説明している。塔の奥にある最後の記録を探そう。',
    'reach-heart-chamber':
      '塔の下層が開いた。3階のハッチの衛兵を倒し、5階の塔の心臓部まで戦い進もう。',
    'claim-restoration-core': 'コアの守護者を倒した。復元コアを回収しよう。',
    'return-restoration-core': '復元コアを村の守衛長のもとへ持ち帰る。',
    'story-complete': '復元コアは村に戻った。塔を復旧できる。',
    'ledger-resolved':
      '管理人の最後の記録が、守護者の隔離不具合の理由を明らかにした。',
  },
  maps: {
    village: 'はじまりの村',
    floor1: '塔 1階',
    floor2: '塔 2階',
    floor3: '塔 3階',
    floor4: '塔 4階',
    floor5: '塔 5階',
  },
  sections: {
    'village-square': '村の広場',
    'village-market': '市場通り',
    'village-tower-road': '塔への道',
    'village-mine-trail': '鉱山の小道',
    'village-crypt-lane': '地下墓所の小道',
    'village-barrow-path': '古墳への小道',
    'floor1-entry-court': '入口の中庭',
    'floor1-lower-loop': '下の周回路',
    'floor1-upper-gallery': '上の回廊',
    'floor1-rear-wing': '奥の棟',
    'floor1-workshop-treasury': '工房の宝物庫',
    'floor2-front-landing': '手前の踊り場',
    'floor2-central-hall': '中央ホール',
    'floor2-west-archive': '西の資料室',
    'floor2-east-service': '東の作業棟',
    'floor2-rear-gallery': '奥の回廊',
    'floor3-entry-vestibule': '入口の前室',
    'floor3-twin-galleries': '双子の回廊',
    'floor3-keeper-archive': '管理人の記録庫',
    'floor3-hidden-vault': '隠し金庫',
    'floor3-heart-approach': '心臓部への通路',
    'floor3-heart-stair': '心臓部の階段',
    'floor4-stair-landing': '階段の踊り場',
    'floor4-lower-hall': '下の広間',
    'floor4-west-works': '西の作業場',
    'floor4-east-works': '東の作業場',
    'floor4-west-store': '西の倉庫',
    'floor4-east-store': '東の倉庫',
    'floor4-upper-gallery': '上の回廊',
    'floor4-forge': '鍛冶場',
    'floor4-forge-cellar': '鍛冶場の地下室',
    'floor5-landing': '下の踊り場',
    'floor5-outer-ring': '外環',
    'floor5-middle-ring': '中環',
    'floor5-inner-ring': '内環',
    'floor5-west-vault': '西の金庫',
    'floor5-east-vault': '東の金庫',
    'floor5-heart-chamber': '心臓部の間',
  },
  npcs: {
    'village-warden': '守衛長',
    'village-artisan': '職人',
    'village-scout': '斥候',
    'village-scribe': '書記',
    'village-returned-subject': '帰還者',
    'village-elder': '長老',
    'village-guard': '衛兵',
    'village-child': '子ども',
    'floor2-missing-subject': '行方不明者',
  },
  shops: {
    'village-weapon-shop': '鍛冶屋',
    'village-armor-shop': '防具屋',
    'village-item-shop': '商人',
  },
  items: {
    'iron-sword': '鉄の剣',
    'steel-sword': '鋼の剣',
    'runed-blade': 'ルーンブレード',
    'leather-vest': '革のベスト',
    'chain-mail': '鎖かたびら',
    'plate-armor': 'プレートアーマー',
    'vitality-charm': '活力のお守り',
    'heart-amulet': 'ハートのアミュレット',
    'life-crystal': '生命の水晶',
    'ledger-fragment-1': '記録簿の断片',
    'tower-depth-sigil': '塔の紋章',
    'tower-restoration-core': '復元コア',
  },
  clues: {
    'floor1-route-mark': '引っかき傷は、下から戻ってくる通路を指している。',
    'floor1-treasury-overlook':
      '見えている宝物庫に面したアーチは、こちら側から煉瓦で塞がれている。',
    'floor2-paired-release-ledger':
      '開かれたままの管理人の記録簿に、こう書かれている。「広間の解放装置は対になっている。どちらも作業棟に置かれた歩哨に従う——歩哨が立っている限り、どちらの門も動かない。」',
    'floor3-heart-lockdown-record':
      '管理人が最後の警告を刻んでいた。守護の格子は、二階下、真の心臓部にある隔離状態をいまも守り続けている。止まった守護者を打ち破り、復元コアを回収し、塔の流れが完全に途絶える前に村へ持ち帰れ。',
    'floor3-keeper-final-record':
      '管理人の最後の記録：対になった解放装置が、守護者の制御不具合を隔離した。隔離は保たれたが、解除しに戻る者はなく、塔の流れは村へ供給され続け、ついにコアが弱り始めた。',
    'floor3-vault-route-mark':
      '古い経路の引っかき傷がここにも繰り返されている。ただし一つだけ、塔の心臓部ではなく北西の壁へ折り返す傷がある。',
    'floor4-landing-scratches':
      '階段の脇に刻まれている。「心臓部は一つ下の階にある。鋳造所を抜けるどの道も、剣で答えねばならない。」',
    'floor5-lattice-record':
      '守護の格子は、いまも古い隔離命令を唸らせている。その奥では、動かなくなった昇降機の縦坑の上で復元コアが待っている。',
  },
  access: {
    'village-lift-to-floor5':
      '昇降機の籠が縦坑の中で動かずにぶら下がっている。その差し込み口は動力コアの形をしている。',
    'village-mine-entrance':
      '倒れた木材が古い鉱山の坑道をふさいでいる。今は入れない。',
    'village-crypt-entrance':
      '錆びた錠のついた鉄格子が、地下墓所の階段をふさいでいる。今は入れない。',
    'village-barrow-entrance':
      '墳墓の入口に転がされた大きな石は、びくともしない。今は入れない。',
    'floor1-front-to-floor2':
      '紋章の形をした差し込み口が、下への階段を封じている。',
    'floor2-depth-to-floor3':
      '下の管理人の封印は、行方不明者が下からの警告を持って戻るまで外れない。',
    'floor5-lift-to-village':
      '昇降機の籠は動かずにぶら下がっている。その差し込み口は動力コアの形をしている。',
  },
  notes: {
    'village-tower-stairs-used': '階段が村と1階をつないでいる。',
    'floor1-treasury-seen': '入口の中庭から、封じられた宝物庫が見える。',
    'floor1-treasury-sealed':
      '宝物庫のアーチは、こちら側から煉瓦で塞がれている。',
    'floor1-route-mark-seen':
      '経路の引っかき傷は、下から戻ってくる通路を指している。',
    'floor1-depth-seal-seen':
      '紋章の形をした差し込み口が、下への階段を封じている。',
    'floor1-depth-stairs-used': '下への階段は2階に通じている。',
    'floor1-rear-stairs-used': 'もう一つの階段が奥の棟に戻っている。',
    'floor1-treasury-return-used':
      '宝物庫の裏の隠し階段が2階に通じている——封じられた宝物庫には裏から入れる。',
    'floor2-paired-release-ledger-read':
      '管理人は広間の二つの解放装置を対にした。作業棟の歩哨が倒れるまで、どちらも閉じたままだ。',
    'floor2-depth-seal-seen':
      '下の封印は、行方不明者が管理人の警告を持って戻るまで外れなかった。',
    'floor2-depth-stairs-used': '封じられていた下への階段は3階に通じている。',
    'floor3-keeper-final-record-read':
      '管理人の最後の記録によれば、対になった解放装置が守護者の制御不全の状態を隔離したまま、塔は村の仕組みへの供給を続けていた。',
    'floor3-depth-stairs-used': '心臓部の歩哨の背後の階段は4階に通じている。',
    'floor4-depth-stairs-used': '鋳造所の階段は5階、塔の心臓部に通じている。',
    'tower-lift-seen':
      '動かない昇降機の籠が、村と塔の心臓部をつないでいる。その差し込み口は動力コアの形をしている。',
  },
  dialogue: {
    'warden-main-lead': '1階を探して、下への階段を開く紋章を見つけてくれ。',
    'warden-sigil-found':
      'その紋章は下の封印と一致する。次の階への階段は、もう開くはずだ。',
    'artisan-find-workshop':
      'うちの工房は塔の中に封じられてしまったんだ。その宝物庫を探してほしい。',
    'artisan-workshop-seen':
      '入口側から工房の宝物庫が見えたんだね。もっと近づく道を探してくれ。',
    'artisan-find-other-entrance':
      'こちら側のアーチは煉瓦で塞がれている。きっと下に別の入口があるはずだ。',
    'scout-find-marks':
      '古い見取り図に、通路のないはずの場所を通る帰り道が描かれている。道すじの引っかき傷に気をつけて。',
    'scout-marks-seen':
      'その傷は古い見取り図と一致する。たぶん下から合流する道だ。',
    'scribe-find-ledger':
      '塔の管理人は、すべての仕掛けを記録していました。記録簿の断片を見つけたら持ち帰ってください。',
    'scribe-fragment-found':
      'この断片には、対になった仕掛けのことが書かれています。塔の奥に、残りのページがあるはずです。',
    'warden-subject-returned':
      '無事に連れ戻してくれたな。だが、奥の回廊の下にある封じられた扉——その向こうにあるものは、もう放っておけない。',
    'subject-returning':
      '村へは自分で戻れます。守衛長に、私は無事だと伝えてください——それと、まだ下に何かが待っているとも。',
    'subject-village':
      '無事に帰ってこられました。でも、奥の回廊の下で見たものが、まだ頭から離れません。誰かがさらに奥を調べなければ。',
    'artisan-treasury-route-found':
      '隠し階段が下から宝物庫へ通じているって？ 行ってくれ——うちの家宝を、ようやく取り戻せる。',
    'artisan-heirloom-recovered':
      '工房の家宝が、ついに戻ってきた。一家を代表して礼を言うよ、探索者さん。',
    'scout-route-verified':
      'つまり、帰り道は本当にあったんだな。古い見取り図は正しかった——失われた経路は確かめられた。',
    'scribe-floor2-ledger-read':
      '対になった解放装置……断片が言っていたのは、そういうことでしたか。管理人の最後の記録は、塔のもっと奥にあるはずです。',
    'warden-restoration-ending':
      '復元コアがあれば、村の暮らしを支える塔の流れを再び動かせる。守護者の封鎖は破られた。ついにこの仕組みを復旧できる。',
    'warden-restoration-ending-ledger':
      '復元コアがあれば、村への供給を再開できる。管理人の記録は不具合の理由も教えてくれた。対になった解放装置が守護者の制御不具合を隔離したが、その隔離は解除されないままだったのだ。真実を損なわずに、この仕組みを復旧できる。',
    'scribe-final-ledger-read':
      'その最後の記録で、記録簿は完結しました。守護者たちは緊急の隔離状態に閉じ込められ、村は彼らが守っていたのと同じ仕組みに頼り続けていたのです。',
    'elder-sealed-crypt':
      '東の丘の下の地下墓所は、わしが生まれる前に封じられた。いつか誰かが開けねばならんが、今日ではない。',
    'guard-sealed-mine':
      '古い鉱山は何年も前に崩れた。坑道の補強が済むまで、誰も下りない。',
    'child-gold-tip':
      '塔の衛兵をやっつけると、コインを落とすんだよ！市場通りのお店で、それを装備と交換してくれるよ。',
  },
};
