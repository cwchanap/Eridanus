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
    equipment: '装備',
    slotEmpty: 'なし',
    unequipped: '未装備',
    keyItems: 'だいじなもの',
    location: '現在地',
    messages: 'メッセージ',
    closeMessage: 'メッセージを閉じる',
    enemy: '敵',
    combat: '戦闘',
    hpLoss: (loss) => `失うHP：${loss}`,
    leavesYouAt: (hp) => `戦闘後 ${hp}`,
    fight: '戦う',
    cancel: 'やめる',
    youStrike: (damage) => `${damage} のダメージを与えた。`,
    enemyStrikes: (damage) => `反撃で ${damage} のダメージを受けた。`,
    skip: 'スキップ',
    shop: 'お店',
    price: (price) => `価格：${price}ゴールド`,
    youHave: (gold) => `所持：${gold}`,
    leavesYou: (gold) => `購入後：${gold}`,
    buy: '買う',
    leave: '立ち去る',
    trade: '取引',
    invalidSave: '無効なセーブ',
    invalidSaveTitle: 'セーブデータが無効です。',
    invalidSaveBody:
      'このブラウザに保存された記録は読み込めません。リセットして新しく始めてください。',
    resetSave: 'セーブをリセット',
    menu: 'メニュー',
    closeMenu: 'メニューを閉じる',
    quests: 'クエスト',
    sideLeads: 'サブの手がかり',
    notes: 'メモ',
    noNotes: 'まだ何もメモしていない。',
    placesFound: '見つけた場所',
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
    menu: (esc) =>
      `${esc}でメニューを開く：勇者、持ち物、クエスト、メモを確認できる。`,
    autosave: '進行状況は自動で保存される。',
    tip: 'まずは青緑のマントを着た守衛長に話しかけてみよう。',
  },
  statLabels: {
    hp: 'HP',
    attack: '攻撃',
    defense: '防御',
    gold: 'ゴールド',
  },
  slotLabels: {
    weapon: '武器',
    armor: '防具',
    accessory: 'アクセサリー',
  },
  statNames: {
    attack: '攻撃力',
    defense: '防御力',
    hp: 'HP',
  },
  tags: {
    clue: '手がかり',
    powerUp: 'パワーアップ',
    shortcut: '近道',
    sealed: '封鎖',
    victory: '勝利',
    purchased: '購入',
    traded: '取引',
    item: 'アイテム',
    lever: 'レバー',
  },
  effects: {
    statUp: (stat, amount) => `${stat}が${amount}上がった。`,
    latchOpened: 'かんぬきが外れた。この近道は両側から通れるようになった。',
    latchGuarded: (remaining) =>
      `衛兵がこのかんぬきを閉ざしている。あと${remaining}体倒すと開く。`,
    latchWired: (thrown, total) =>
      `このハッチは${total}本のレバーにつながっていて、すべてが倒れているあいだだけ開く。いま倒れているのは${total}本中${thrown}本。`,
    leverPulled: (thrown, linked) =>
      `${thrown ? 'レバーを倒した。' : 'レバーを押し戻した。'}${
        linked === 0
          ? ''
          : linked === 1
            ? 'もう一本のレバーが一緒に動いた。'
            : `ほかに${linked}本のレバーが一緒に動いた。`
      }`,
    victory: (hpLost, gold) =>
      `敵を倒した。失ったHP：${hpLost}。${gold > 0 ? `獲得ゴールド：${gold}。` : ''}`,
    purchased: (item, stat, amount) =>
      `${item}を装備した：${stat} +${amount}。`,
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
      '塔の下層が開いた。3階のハッチにつながるレバーを3本とも下ろし、5階の塔の心臓部まで戦い進もう。',
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
    'floor1-west-passages': '西の通路',
    'floor1-upper-gallery': '上の回廊',
    'floor1-sigil-vault': '紋章の金庫',
    'floor1-rear-wing': '奥の棟',
    'floor1-workshop-treasury': '工房の宝物庫',
    'floor2-front-landing': '手前の踊り場',
    'floor2-service-corridor': '作業用通路',
    'floor2-reading-room': '封じられた閲覧室',
    'floor2-reading-room-loft': '閲覧室の中二階',
    'floor2-east-service': '東の作業棟',
    'floor2-central-hall': '中央ホール',
    'floor2-west-archive': '西の資料室',
    'floor3-spine': '背骨の回廊',
    'floor3-north-passage': '北の通路',
    'floor3-hidden-vault': '隠し金庫',
    'floor3-heart': '心臓部への通路',
    'floor3-keeper-archive': '管理人の記録庫',
    'floor3-galleries': '南の回廊',
    'floor3-undercroft': '地下聖堂',
    'floor3-west-crypt-walk': '西の墓所通路',
    'floor3-east-crypt-walk': '東の墓所通路',
    'floor4-stair-landing': '階段の踊り場',
    'floor4-west-works': '西の作業場',
    'floor4-east-works': '東の作業場',
    'floor4-forge': '鍛冶場',
    'floor4-casting-gallery': '鋳造の回廊',
    'floor4-slag-cellar': '鉱滓の地下室',
    'floor4-west-flues': '西の煙道',
    'floor4-east-flues': '東の煙道',
    'floor5-landing': '下の踊り場',
    'floor5-west-ring': '西環',
    'floor5-north-ring': '北環',
    'floor5-east-ring': '東環',
    'floor5-south-ring': '南環',
    'floor5-inner-ring': '内環',
    'floor5-sanctum': '至聖所',
    'floor5-old-shaft': '古い縦坑',
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
    'village-status-trader': 'ステータス商人',
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
    'floor1-treasury-overlook':
      '見えている宝物庫に面したアーチは、こちら側から煉瓦で塞がれている。',
    'floor1-route-mark': '引っかき傷は、下から戻ってくる通路を指している。',
    'floor1-gallery-tally':
      '壁一面に日数を数える刻み目があり、その下にこう書かれている。「九日目。番人たちはもう我々を通さない。塔の紋章を見つけた者は、それを下へ持っていけ。下の階段はまだその形を覚えている。」',
    'floor1-rear-note':
      '石の隙間に紙片が挟まっている。「動力核はまだ温かい。下へ持っていけ。記録庫の解放装置を守る歩哨も、これには敵わない。」',
    'floor2-paired-release-ledger':
      '開かれたままの管理人の記録簿に、こう書かれている。「広間の解放装置は対になっている。どちらも作業棟に置かれた歩哨に従う——歩哨が立っている限り、どちらの門も動かない。」',
    'floor2-hall-notice':
      '棚に釘で打ちつけられた通達。「管理人の命により、下へ降りた者が戻るまで、降下の封印は閉ざしておくこと。」',
    'floor2-index-card':
      '破れた索引カード。「宝物庫の階段、最後の通路。そこに置かれた大男は、どの管理人にも従わない。」',
    'floor2-reading-room-glimpse':
      '書棚の足元の隙間から、下にランプの灯る閲覧室が見える。こちら側に扉はない。管理人の走り書き。「古い縦坑が、塔の心臓部からそこへ通じている。」',
    'floor2-reading-room-index':
      '閲覧室の目録には一つの棚しか載っていない。「管理人の武具。心臓部から古い縦坑を登ってくる者のために取っておく。」',
    'floor3-vault-route-mark':
      '古い経路の引っかき傷がここにも繰り返されている。ただし一つだけ、塔の心臓部ではなく西の壁へ折り返す傷がある。',
    'floor3-crypt-crack':
      '壁の割れ目の向こうに、四方を封じられた墓所がある。奥の端から階段が上へ伸びているが、この階へ通じる扉はない。',
    'floor3-keeper-final-record':
      '管理人の最後の記録：対になった解放装置が、守護者の制御不具合を隔離した。隔離は保たれたが、解除しに戻る者はなく、塔の流れは村へ供給され続け、ついにコアが弱り始めた。',
    'floor3-hatch-diagram':
      '棚に配線図が留めてある。心臓部のハッチは三本のレバーにつながっている。西の支道の突き当たり、最後の回廊の突き当たり、そしてこの記録庫の頂。三本すべてが下りているあいだだけ開く。',
    'floor3-heart-lockdown-record':
      '管理人が最後の警告を刻んでいた。守護の格子は、二階下、真の心臓部にある隔離状態をいまも守り続けている。止まった守護者を打ち破り、復元コアを回収し、塔の流れが完全に途絶える前に村へ持ち帰れ。',
    'floor3-shaft-record':
      '壁龕に刻まれている。「管理人の縦坑は、心臓部から閲覧室まで続く。両端のハッチを除き、扉はすべて封じた。」',
    'floor4-landing-scratches':
      '階段の脇に刻まれている。「心臓部は一つ下の階にある。鍛冶場の番人が、鋳造門へ続く縦坑を守っている。二人の親方がそれぞれの作業場で守る鋼なしには、誰も彼を越えられない。」',
    'floor4-linkage-note':
      '組立工のメモ。「鋳造門の四本のレバーは、古い連動機構を共有している。一本を倒すと、隣のレバーも一緒に跳ねる。門は四本すべてが下りているあいだしか開かない。」',
    'floor4-cellar-crack':
      '煙道の壁の割れ目から鉱滓の地下室が見える。四方を封じられた渦巻きで、その中心に階段がある。この階のどこからも入れない。',
    'floor4-foundry-ledger':
      '鋳造所の帳簿。「古い金庫の階段は西の倉庫から上へ延びている。あの倉庫には見張りを置いておけ。」',
    'floor4-shaft-scrawl':
      '煙道の壁に管理人の走り書きがある。古い縦坑は、二人の金庫番が守る五階の西の金庫のハッチから始まり、この地下室とその上の墓所を抜けて、二階の閲覧室まで登っている。',
    'floor5-seal-inscription':
      '階段の脇に刻まれている。「三人の番人が、西・南・東で至聖所の封印を守っている。一人でも立っている限り、心臓部は閉ざされたままだ。」',
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
      '塔の衛兵をやっつけると、コインを落とすんだよ！市場通りのお店で、それを装備と交換してくれるよ。通りの西のはしにいるステータス商人は、コインを能力そのものに変えてくれるんだ。',
  },
};
