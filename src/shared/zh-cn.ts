import type { Region } from "./types.js";

export const REGION_LABELS: Record<Region, string> = {
  JOHTO: "城都", KANTO: "关都", UNKNOWN: "未知区域"
};

// Chinese place names: https://wiki.52poke.com/zh-hans/城都地区
// and https://wiki.52poke.com/zh-hans/关都地区
const LANDMARK_LABELS: Record<string, string> = {
  NEW_BARK_TOWN: "若叶镇",
  CHERRYGROVE_CITY: "吉花市",
  VIOLET_CITY: "桔梗市",
  SPROUT_TOWER: "喇叭芽之塔",
  RUINS_OF_ALPH: "阿露福遗迹",
  UNION_CAVE: "互连洞",
  AZALEA_TOWN: "桧皮镇",
  SLOWPOKE_WELL: "呆呆兽之井",
  ILEX_FOREST: "栎树林",
  GOLDENROD_CITY: "满金市",
  RADIO_TOWER: "满金播音塔",
  NATIONAL_PARK: "自然公园",
  ECRUTEAK_CITY: "缘朱市",
  TIN_TOWER: "铃铛塔",
  BURNED_TOWER: "烧焦塔",
  OLIVINE_CITY: "浅葱市",
  LIGHTHOUSE: "浅葱灯塔",
  BATTLE_TOWER: "对战塔",
  WHIRL_ISLANDS: "漩涡岛",
  CIANWOOD_CITY: "湛蓝市",
  MT_MORTAR: "擂钵山",
  MAHOGANY_TOWN: "卡吉镇",
  LAKE_OF_RAGE: "愤怒之湖",
  ICE_PATH: "冰雪小径",
  BLACKTHORN_CITY: "烟墨市",
  DRAGONS_DEN: "龙穴",
  DARK_CAVE: "黑暗洞穴",
  SILVER_CAVE: "白银山",
  PALLET_TOWN: "真新镇",
  VIRIDIAN_CITY: "常青市",
  PEWTER_CITY: "深灰市",
  MT_MOON: "月见山",
  CERULEAN_CITY: "华蓝市",
  UNDERGROUND_PATH: "地下通道",
  VERMILION_CITY: "枯叶市",
  DIGLETTS_CAVE: "地鼠洞穴",
  ROCK_TUNNEL: "岩山隧道",
  POWER_PLANT: "发电厂",
  LAVENDER_TOWN: "紫苑镇",
  LAV_RADIO_TOWER: "紫苑播音塔",
  CELADON_CITY: "玉虹市",
  SAFFRON_CITY: "金黄市",
  FUCHSIA_CITY: "浅红市",
  SEAFOAM_ISLANDS: "双子岛",
  CINNABAR_ISLAND: "红莲岛",
  VICTORY_ROAD: "冠军之路",
  INDIGO_PLATEAU: "石英高原",
  TOHJO_FALLS: "都城瀑布",
  FAST_SHIP: "水流号"
};

export function landmarkLabel(key: string): string {
  const route = /^ROUTE_(\d+)$/.exec(key);
  return route ? `${route[1]}号道路` : LANDMARK_LABELS[key] ?? "未知地点";
}

// https://wiki.52poke.com/zh-hans/徽章
export const BADGE_LABELS = ["飞翼徽章", "昆虫徽章", "常规徽章", "幻影徽章", "打击徽章", "钢铁徽章", "冰雪徽章", "升龙徽章"];
export const KANTO_BADGE_LABELS = ["灰色徽章", "蓝色徽章", "橙色徽章", "彩虹徽章", "粉红徽章", "金色徽章", "深红徽章", "绿色徽章"];

const DIAGNOSTIC_LABELS: Record<string, string> = {
  UDP_VERSION_OK: "模拟器连接正常",
  GET_STATUS_OK: "游戏状态读取正常",
  READ_CORE_RAM_OK: "游戏数据读取正常",
  UNSUPPORTED_ROM: "游戏文件不受支持",
  ROM_OK: "游戏文件识别成功",
  SPRITE_EXTRACTION: "精灵素材提取提示",
  ROM_READ_ERROR: "游戏文件读取失败",
  ROM_CRC_MISMATCH: "当前游戏版本不匹配",
  RAM_READ_TIMEOUT: "游戏数据读取超时",
  UDP_NO_RESPONSE: "模拟器未响应",
  READ_CORE_RAM_UNSUPPORTED: "模拟器不支持数据读取",
  STATUS_FORMAT_UNSUPPORTED: "游戏状态无法识别",
  RETROARCH_COMMAND_ERROR: "模拟器通信失败",
  RAM_ADDRESS_MODE: "数据读取方式",
  RAM_ALL_ZERO: "等待有效游戏数据",
  RAM_ADDRESS_MODE_UNRESOLVED: "无法定位游戏数据",
  PLAYER_NAME: "玩家姓名",
  GAME_TIME: "游戏时长",
  MONEY: "持有金钱",
  PARTY_COUNT: "队伍数量",
  MAP: "当前位置",
  TEST_FAILED: "连接测试失败"
};

export function diagnosticLabel(code: string): string {
  const party = /^PARTY_(\d+)$/.exec(code);
  return party ? `队伍第 ${party[1]} 格` : DIAGNOSTIC_LABELS[code] ?? "检查结果";
}
