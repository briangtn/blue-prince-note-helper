// Catalogue d'items Blue Prince (connaissances du jeu).
// ⚠️ ANTI-SPOIL : ce catalogue sert UNIQUEMENT à révéler une illustration
// quand tu tapes le nom EXACT d'un item déjà découvert. Il n'est jamais
// listé en entier dans l'UI (même principe que roomCatalog).
// Source : https://blue-prince.fandom.com/wiki/Items (catégorie « Item Icons »).
//
// cat = catégorie d'item (Contraption = craftable à l'Atelier).
const CDN = 'https://static.wikia.nocookie.net/blue-prince/images'

// name -> { path (relatif au CDN), cat }
const RAW = {
  'Basement Key': ['/e/eb/Basement_Key_White_Icon.png/revision/latest', 'Key'],
  'Battery Pack': ['/5/54/Battery_Pack_White_Icon.png/revision/latest', 'Special'],
  'Broken Lever': ['/b/bb/Broken_Lever_White_Icon.png/revision/latest', 'Special'],
  'Burning Glass': ['/f/f8/Burning_Glass_White_Icon.png/revision/latest', 'Contraption'],
  'Car Keys': ['/9/93/Car_Keys_White_Icon.png/revision/latest', 'Major Key'],
  'Chronograph': ['/5/50/Chronograph_White_Icon.png/revision/latest', 'Luxury'],
  'Coin Purse': ['/3/36/Coin_Purse_White_Icon.png/revision/latest', 'Special'],
  'Compass': ['/4/4f/Compass_White_Icon.png/revision/latest', 'Special'],
  'Coupon Book': ['/8/8a/Coupon_Book_White_Icon.png/revision/latest', 'Special'],
  'Crown of the Blueprints': ['/2/25/Crown_of_the_Blueprints_White_Icon.png/revision/latest', 'Special'],
  'Cursed Effigy': ['/c/c0/Cursed_Effigy_White_Icon.png/revision/latest', 'Special'],
  'Detector Shovel': ['/5/50/Detector_Shovel_White_Icon.png/revision/latest', 'Contraption'],
  'Diary Key': ['/4/4a/Diary_Key_White_Icon.png/revision/latest', 'Key'],
  'Dowsing Rod': ['/3/34/Dowsing_Rod_White_Icon.png/revision/latest', 'Contraption'],
  'Electromagnet': ['/9/98/Electromagnet_White_Icon.png/revision/latest', 'Contraption'],
  'Emerald Bracelet': ['/8/8b/Emerald_Bracelet_White_Icon.png/revision/latest', 'Luxury'],
  'File Cabinet Key': ['/a/af/File_Cabinet_Key_White_Icon.png/revision/latest', 'Key'],
  'Gear Wrench': ['/7/7f/Gear_Wrench_White_Icon.png/revision/latest', 'Special'],
  'Hallpass': ['/1/10/Hallpass_White_Icon.png/revision/latest', 'Special'],
  'Ivory Dice': ['/d/d7/Ivory_Dice_White_Icon.png/revision/latest', 'Resource'],
  'Jack Hammer': ['/a/a5/Jack_Hammer_White_Icon.png/revision/latest', 'Contraption'],
  'Key 8': ['/b/b5/Key_8_White_Icon.png/revision/latest', 'Key'],
  'Key of Aries': ['/0/09/Key_of_Aries_White_Icon.png/revision/latest', 'Key'],
  'Keycard': ['/5/5f/Keycard_White_Icon.png/revision/latest', 'Major Key'],
  'Knight\'s Shield': ['/a/a0/Knight%27s_Shield_White_Icon.png/revision/latest', 'Special'],
  'Lockpick': ['/3/38/Lockpick_White_Icon.png/revision/latest', 'Special'],
  'Lucky Purse': ['/3/3b/Lucky_Purse_White_Icon.png/revision/latest', 'Contraption'],
  'Lucky Rabbit\'s Foot': ['/9/98/Lucky_Rabbit%27s_Foot_White_Icon.png/revision/latest', 'Special'],
  'Lunch Box': ['/7/74/Lunch_Box_White_Icon.png/revision/latest', 'Food'],
  'Magnifying Glass': ['/4/46/Magnifying_Glass_White_Icon.png/revision/latest', 'Special'],
  'Master Key': ['/4/4c/Master_Key_White_Icon.png/revision/latest', 'Major Key'],
  'Metal Detector': ['/1/19/Metal_Detector_White_Icon.png/revision/latest', 'Special'],
  'Microchip A': ['/d/d2/Microchip_A_White_Icon.png/revision/latest', 'Special'],
  'Microchip B': ['/6/6a/Microchip_B_White_Icon.png/revision/latest', 'Special'],
  'Microchip C': ['/a/a5/Microchip_C_White_Icon.png/revision/latest', 'Special'],
  'Moon Pendant': ['/a/a0/Moon_Pendant_White_Icon.png/revision/latest', 'Luxury'],
  'Morning Star': ['/a/ac/Morning_Star_White_Icon.png/revision/latest', 'Special'],
  'Ornate Compass': ['/c/c8/Ornate_Compass_White_Icon.png/revision/latest', 'Luxury'],
  'Paper Crown': ['/b/b6/Paper_Crown_White_Icon.png/revision/latest', 'Special'],
  'Pick Sound Amplifier': ['/e/ed/Pick_Sound_Amplifier_White_Icon.png/revision/latest', 'Contraption'],
  'Power Hammer': ['/8/8f/Power_Hammer_White_Icon.png/revision/latest', 'Contraption'],
  'Prism Key': ['/2/21/Prism_Key_White_Icon.png/revision/latest', 'Major Key'],
  'Repellent': ['/6/65/Repellent_White_Icon.png/revision/latest', 'Special'],
  'Royal Scepter': ['/c/c9/Royal_Scepter_White_Icon.png/revision/latest', 'Special'],
  'Running Shoes': ['/6/62/Running_Shoes_White_Icon.png/revision/latest', 'Special'],
  'Salt Shaker': ['/9/99/Salt_White_Icon.png/revision/latest', 'Special'],
  'Sanctum Key': ['/2/2d/Sanctum_Key_White_Icon.png/revision/latest', 'Major Key'],
  'Secret Garden Key': ['/8/80/Secret_Garden_Key_White_Icon.png/revision/latest', 'Major Key'],
  'Self Igniting Torch': ['/4/4d/Self_Igniting_Torch_White_Icon.png/revision/latest', 'Special'],
  'Shovel': ['/6/60/Shovel_White_Icon.png/revision/latest', 'Special'],
  'Silver Key': ['/2/2b/Silver_Key_White_Icon.png/revision/latest', 'Major Key'],
  'Silver Spoon': ['/5/5f/Silver_Spoon_White_Icon.png/revision/latest', 'Luxury'],
  'Sledgehammer': ['/b/b4/Sledgehammer_White_Icon.png/revision/latest', 'Special'],
  'Sleeping Mask': ['/7/7b/Sleeping_Mask_White_Icon.png/revision/latest', 'Special'],
  'Stop Watch': ['/7/7d/Stop_Watch_White_Icon.png/revision/latest', 'Special'],
  'Telescope': ['/7/70/Telescope_White_Icon.png/revision/latest', 'Special'],
  'The Axe': ['/2/20/The_Axe_White_Icon.png/revision/latest', 'Special'],
  'Treasure Map': ['/b/be/Treasure_Map_White_Icon.png/revision/latest', 'Special'],
  'Upgrade Disk': ['/4/48/Upgrade_Disk_White_Icon.png/revision/latest', 'Special'],
  'Vault Key 149': ['/3/39/Vault_Key_149_White_Icon.png/revision/latest', 'Major Key'],
  'Vault Key 233': ['/a/ad/Vault_Key_233_White_Icon.png/revision/latest', 'Major Key'],
  'Vault Key 304': ['/c/c7/Vault_Key_304_White_Icon.png/revision/latest', 'Major Key'],
  'Vault Key 370': ['/2/27/Vault_Key_370_White_Icon.png/revision/latest', 'Major Key'],
  'Watering Can': ['/0/01/Watering_Can_White_Icon.png/revision/latest', 'Special'],
  'Wind-up Key': ['/b/b5/Wind-up_Key_White_Icon.png/revision/latest', 'Key'],
}

export const ITEM_CATALOG = Object.fromEntries(
  Object.entries(RAW).map(([name, [path, cat]]) => [name, { name, cat, icon: CDN + path }])
)

export const KNOWN_ITEM_NAMES = Object.keys(ITEM_CATALOG)

// Recherche tolérante : nom exact (insensible à la casse / aux espaces).
export function lookupItem(name) {
  if (!name) return null
  const key = name.trim().toLowerCase()
  for (const it of Object.values(ITEM_CATALOG)) {
    if (it.name.toLowerCase() === key) return it
  }
  return null
}

export function itemIconUrl(name) {
  return lookupItem(name)?.icon ?? null
}

