// ===== Список товаров =====
// ⚠️ ФАЙЛ СОЗДАН АВТОМАТИЧЕСКИ из Excel-таблицы программой tools/import_table.py.
// Правь товары в таблице и запускай импорт заново — ручные правки здесь пропадут.
//   py tools/import_table.py "путь\к\таблице.xlsx"
//
// Поля: id — номер на сайте; sku — номер из твоей таблицы; category — раздел;
// type — original/replica/restored; repair — blade (перо) / shaft (труба);
// specs — curve (загиб), flex (жёсткость), hand (хват), goalie (вратарская), paddle (длина пера),
// size (размер); price — цена (null = по запросу); inStock — в наличии; photos — список фото.

window.PRODUCTS = [
  {
    "id": 1001,
    "sku": "2",
    "category": "sticks",
    "type": "restored",
    "brand": "Bauer",
    "name": "Черная",
    "specs": {
      "hand": "Левый",
      "goalie": true,
      "paddle": "26″"
    },
    "price": 4000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1002,
    "sku": "3",
    "category": "sticks",
    "type": "restored",
    "brand": "CCM",
    "name": "Premier 2",
    "specs": {
      "hand": "Левый",
      "goalie": true
    },
    "price": 4000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1003,
    "sku": "4",
    "category": "sticks",
    "type": "restored",
    "brand": "Warrior",
    "name": "Белая",
    "specs": {
      "hand": "Левый",
      "goalie": true
    },
    "price": 3500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1004,
    "sku": "6",
    "category": "sticks",
    "type": "restored",
    "brand": "Заряд",
    "name": "Apex",
    "specs": {
      "curve": "P29",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 3000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1005,
    "sku": "7",
    "category": "sticks",
    "type": "restored",
    "brand": "Заряд",
    "name": "Apex",
    "specs": {
      "curve": "P28",
      "flex": 90,
      "hand": "Левый"
    },
    "price": 3000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1006,
    "sku": "8",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Laser",
    "specs": {
      "curve": "P28",
      "flex": 77,
      "hand": "Левый"
    },
    "price": 3000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1007,
    "sku": "10",
    "category": "sticks",
    "type": "restored",
    "brand": "Warrior",
    "name": "Lx2",
    "specs": {
      "curve": "P29",
      "flex": 85,
      "hand": "Правый"
    },
    "price": 3500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1008,
    "sku": "11",
    "category": "sticks",
    "type": "restored",
    "brand": "CCM",
    "name": "Ft 8",
    "specs": {
      "curve": "P29",
      "flex": 80,
      "hand": "Правый"
    },
    "price": 3500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1009,
    "sku": "12",
    "category": "sticks",
    "type": "restored",
    "brand": "Bauer",
    "name": "Tracer",
    "specs": {
      "curve": "P29",
      "flex": 50,
      "hand": "Левый"
    },
    "price": 3000,
    "inStock": true,
    "photos": [],
    "repair": "blade"
  },
  {
    "id": 1010,
    "sku": "14",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Master fsrt",
    "specs": {
      "curve": "P28",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 4000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1011,
    "sku": "15",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hitch (серый)",
    "specs": {
      "curve": "P28",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 4000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1012,
    "sku": "16",
    "category": "sticks",
    "type": "restored",
    "brand": "CCM",
    "name": "Ft 5",
    "specs": {
      "curve": "P28",
      "flex": 75,
      "hand": "Правый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1013,
    "sku": "18",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hitch (серый)",
    "specs": {
      "curve": "P29",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1014,
    "sku": "20",
    "category": "sticks",
    "type": "restored",
    "brand": "Bauer",
    "name": "E5 Pro",
    "specs": {
      "curve": "P92",
      "flex": 77,
      "hand": "Правый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1015,
    "sku": "21",
    "category": "sticks",
    "type": "restored",
    "brand": "Warrior",
    "name": "2lx Pro",
    "specs": {
      "curve": "P29",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1016,
    "sku": "23",
    "category": "sticks",
    "type": "restored",
    "brand": "Sherwood",
    "name": "Code Encrypt",
    "specs": {
      "curve": "P29",
      "flex": 85,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1017,
    "sku": "24",
    "category": "sticks",
    "type": "restored",
    "brand": "Bauer",
    "name": "Fly Pro",
    "specs": {
      "curve": "P92",
      "flex": 87,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1018,
    "sku": "25",
    "category": "sticks",
    "type": "restored",
    "brand": "Bauer",
    "name": "Fly Pro",
    "specs": {
      "curve": "P92",
      "flex": 87,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1019,
    "sku": "26",
    "category": "sticks",
    "type": "restored",
    "brand": "Bauer",
    "name": "Fly Pro",
    "specs": {
      "curve": "P92",
      "flex": 87,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1020,
    "sku": "27",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hitch (серый)",
    "specs": {
      "curve": "P29",
      "flex": 85,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1021,
    "sku": "28",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Master fsrt",
    "specs": {
      "curve": "P29",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 3500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1022,
    "sku": "29",
    "category": "sticks",
    "type": "restored",
    "brand": "Bauer",
    "name": "E50 Pro",
    "specs": {
      "curve": "P92",
      "flex": 87,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1023,
    "sku": "31",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hitch (белый)",
    "specs": {
      "curve": "P28",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1024,
    "sku": "32",
    "category": "sticks",
    "type": "restored",
    "brand": "Bauer",
    "name": "X5",
    "specs": {
      "curve": "P92",
      "flex": 87,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1025,
    "sku": "33",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hitch (белый)",
    "specs": {
      "curve": "P29",
      "flex": 85,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1026,
    "sku": "34",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hitch (серый)",
    "specs": {
      "curve": "P29",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1027,
    "sku": "36",
    "category": "sticks",
    "type": "restored",
    "brand": "Sherwood",
    "name": "Code Encrypt",
    "specs": {
      "curve": "P28",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1028,
    "sku": "38",
    "category": "sticks",
    "type": "restored",
    "brand": "Sherwood",
    "name": "Code Encrypt",
    "specs": {
      "curve": "P92",
      "flex": 75,
      "hand": "Правый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1029,
    "sku": "40",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hitch (белый)",
    "specs": {
      "curve": "P90",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1030,
    "sku": "51",
    "category": "sticks",
    "type": "restored",
    "brand": "Заряд",
    "name": "белый",
    "specs": {
      "curve": "P28",
      "flex": 65,
      "hand": "Правый"
    },
    "price": 4000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1031,
    "sku": "52",
    "category": "sticks",
    "type": "restored",
    "brand": "CCM",
    "name": "H8",
    "specs": {
      "curve": "P28",
      "flex": 50,
      "hand": "Левый"
    },
    "price": 5000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1032,
    "sku": "69",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hit Force",
    "specs": {
      "curve": "P28",
      "flex": 65,
      "hand": "Правый"
    },
    "price": 3000,
    "inStock": true,
    "photos": [],
    "repair": "blade"
  },
  {
    "id": 1033,
    "sku": "70",
    "category": "sticks",
    "type": "restored",
    "brand": "Bauer",
    "name": "2S",
    "specs": {
      "curve": "P90",
      "flex": 112,
      "hand": "Левый"
    },
    "price": 4000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1034,
    "sku": "71",
    "category": "sticks",
    "type": "restored",
    "brand": "Sherwood",
    "name": "Encrypt 1",
    "specs": {
      "curve": "P92",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 4000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1035,
    "sku": "72",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hit ultra",
    "specs": {
      "curve": "P28",
      "flex": 70,
      "hand": "Правый"
    },
    "price": null,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1036,
    "sku": "73",
    "category": "sticks",
    "type": "restored",
    "brand": "CCM",
    "name": "Trigger 7",
    "specs": {
      "curve": "P29",
      "flex": 85,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1037,
    "sku": "74",
    "category": "sticks",
    "type": "restored",
    "brand": "Sherwood",
    "name": "TPM",
    "specs": {
      "curve": "P92",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1038,
    "sku": "75",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hit Ultra",
    "specs": {
      "curve": "P28",
      "flex": 95,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1039,
    "sku": "76",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hitch upper (серая)",
    "specs": {
      "curve": "P28",
      "flex": 95,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1040,
    "sku": "77",
    "category": "sticks",
    "type": "restored",
    "brand": "X17",
    "name": "",
    "specs": {
      "curve": "P28",
      "flex": 85,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1041,
    "sku": "78",
    "category": "sticks",
    "type": "restored",
    "brand": "Sherwood",
    "name": "Encrypt",
    "specs": {
      "curve": "P92",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1042,
    "sku": "79",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hit Ultra",
    "specs": {
      "curve": "P92",
      "flex": 85,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1043,
    "sku": "80",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hit Ultra",
    "specs": {
      "curve": "P29",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1044,
    "sku": "81",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hitch Upper",
    "specs": {
      "curve": "P28",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1045,
    "sku": "82",
    "category": "sticks",
    "type": "restored",
    "brand": "Sherwood",
    "name": "Leg1",
    "specs": {
      "curve": "P28",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1046,
    "sku": "83",
    "category": "sticks",
    "type": "restored",
    "brand": "Заряд",
    "name": "T100",
    "specs": {
      "hand": "Левый"
    },
    "price": 4000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1047,
    "sku": "84",
    "category": "sticks",
    "type": "restored",
    "brand": "CCM",
    "name": "AS6",
    "specs": {
      "curve": "P92",
      "flex": 87,
      "hand": "Левый"
    },
    "price": 4000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1048,
    "sku": "85",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hitch Upper",
    "specs": {
      "curve": "P28",
      "flex": 85,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1049,
    "sku": "86",
    "category": "sticks",
    "type": "restored",
    "brand": "CCM",
    "name": "Ft4",
    "specs": {
      "curve": "P92",
      "flex": 80,
      "hand": "Левый"
    },
    "price": 4000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1050,
    "sku": "87",
    "category": "sticks",
    "type": "restored",
    "brand": "MVP",
    "name": "Breezy",
    "specs": {
      "curve": "P92",
      "flex": 85,
      "hand": "Левый"
    },
    "price": 3000,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1051,
    "sku": "88",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hitch Upper",
    "specs": {
      "curve": "P28",
      "flex": 85,
      "hand": "Левый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1052,
    "sku": "79",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hitch (серый)",
    "specs": {
      "curve": "P28",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 2500,
    "inStock": true,
    "photos": [],
    "repair": "blade"
  },
  {
    "id": 1053,
    "sku": "84",
    "category": "sticks",
    "type": "restored",
    "brand": "CCM",
    "name": "Trigger 8",
    "specs": {
      "curve": "P29",
      "flex": 85,
      "hand": "Правый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1054,
    "sku": "88",
    "category": "sticks",
    "type": "restored",
    "brand": "CCM",
    "name": "Trigger 8",
    "specs": {
      "curve": "P29",
      "flex": 85,
      "hand": "Правый"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "shaft"
  },
  {
    "id": 1055,
    "sku": "92",
    "category": "sticks",
    "type": "restored",
    "brand": "CCM",
    "name": "Ft6",
    "specs": {
      "curve": "P29",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 2500,
    "inStock": true,
    "photos": [],
    "repair": "blade"
  },
  {
    "id": 1056,
    "sku": "99",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "SPR",
    "specs": {
      "curve": "P92",
      "flex": 70,
      "hand": "Левый"
    },
    "price": 2500,
    "inStock": true,
    "photos": [],
    "repair": "blade"
  },
  {
    "id": 1057,
    "sku": "100",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hitch (серый)",
    "specs": {
      "curve": "P28",
      "flex": 95,
      "hand": "Левый"
    },
    "price": 2500,
    "inStock": true,
    "photos": [],
    "repair": "blade"
  },
  {
    "id": 1058,
    "sku": "102",
    "category": "sticks",
    "type": "restored",
    "brand": "Заряд",
    "name": "Apex",
    "specs": {
      "curve": "P29",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 2000,
    "inStock": true,
    "photos": [],
    "repair": "blade"
  },
  {
    "id": 1059,
    "sku": "103",
    "category": "sticks",
    "type": "restored",
    "brand": "Союз",
    "name": "Hitch (белый)",
    "specs": {
      "curve": "P28",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 2500,
    "inStock": true,
    "photos": [],
    "repair": "blade"
  },
  {
    "id": 1060,
    "sku": "104",
    "category": "sticks",
    "type": "restored",
    "brand": "Bauer",
    "name": "Shadow",
    "specs": {
      "hand": "Левый",
      "goalie": true,
      "paddle": "25″"
    },
    "price": 4500,
    "inStock": true,
    "photos": [],
    "repair": "blade"
  },
  {
    "id": 2001,
    "sku": "46",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Vision",
    "specs": {
      "curve": "P29",
      "flex": 70,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2002,
    "sku": "47",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Vision",
    "specs": {
      "curve": "P28",
      "flex": 85,
      "hand": "Правый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2003,
    "sku": "50",
    "category": "sticks",
    "type": "replica",
    "brand": "Bauer",
    "name": "Pulse",
    "specs": {
      "curve": "P92",
      "flex": 55,
      "hand": "Правый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2004,
    "sku": "53",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Unleshed",
    "specs": {
      "curve": "P28",
      "flex": 85,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2005,
    "sku": "54",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Unleshed",
    "specs": {
      "curve": "P28",
      "flex": 85,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2006,
    "sku": "55",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Unleshed",
    "specs": {
      "curve": "P29",
      "flex": 55,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2007,
    "sku": "56",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Unleshed",
    "specs": {
      "curve": "P29",
      "flex": 40,
      "hand": "Правый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2008,
    "sku": "57",
    "category": "sticks",
    "type": "replica",
    "brand": "Bauer",
    "name": "FlyLite (фиолетовая)",
    "specs": {
      "curve": "P28",
      "flex": 70,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2009,
    "sku": "58",
    "category": "sticks",
    "type": "replica",
    "brand": "Bauer",
    "name": "FlyLite (оранжевая)",
    "specs": {
      "curve": "P28",
      "flex": 70,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2010,
    "sku": "59",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Ft9 (серая)",
    "specs": {
      "curve": "P28",
      "flex": 85,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2011,
    "sku": "61",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Ghost",
    "specs": {
      "curve": "P29",
      "flex": 70,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2012,
    "sku": "62",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Trigger 10 (белая)",
    "specs": {
      "curve": "P29",
      "flex": 70,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2013,
    "sku": "63",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Trigger 10 (белая)",
    "specs": {
      "curve": "P28",
      "flex": 85,
      "hand": "Правый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2014,
    "sku": "64",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Trigger 10 (белая)",
    "specs": {
      "curve": "P28",
      "flex": 70,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2015,
    "sku": "65",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Trigger 10 (чёрная)",
    "specs": {
      "curve": "P29",
      "flex": 50,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2016,
    "sku": "66",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Ft9 (красный)",
    "specs": {
      "curve": "P28",
      "flex": 70,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2017,
    "sku": "67",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Ft9 (желтый)",
    "specs": {
      "curve": "P29",
      "flex": 50,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2018,
    "sku": "68",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Ft9 (желтый)",
    "specs": {
      "curve": "P29",
      "flex": 50,
      "hand": "Правый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2019,
    "sku": "69",
    "category": "sticks",
    "type": "replica",
    "brand": "Bauer",
    "name": "Flylite",
    "specs": {
      "curve": "P92",
      "flex": 40,
      "hand": "Правый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2020,
    "sku": "70",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Unleshed",
    "specs": {
      "curve": "P92",
      "flex": 40,
      "hand": "Правый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2021,
    "sku": "71",
    "category": "sticks",
    "type": "replica",
    "brand": "Bauer",
    "name": "PulsGraff",
    "specs": {
      "curve": "P92",
      "flex": 30,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2022,
    "sku": "72",
    "category": "sticks",
    "type": "replica",
    "brand": "Bauer",
    "name": "Flylite (синяя)",
    "specs": {
      "curve": "P92",
      "flex": 40,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2023,
    "sku": "73",
    "category": "sticks",
    "type": "replica",
    "brand": "Bauer",
    "name": "Flylite (зеленая)",
    "specs": {
      "curve": "P28",
      "flex": 87,
      "hand": "Правый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2024,
    "sku": "74",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Vizion 2 (синяя)",
    "specs": {
      "curve": "P29",
      "flex": 85,
      "hand": "Правый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2025,
    "sku": "75",
    "category": "sticks",
    "type": "replica",
    "brand": "Bauer",
    "name": "Fuse (красная)",
    "specs": {
      "curve": "P92",
      "flex": 77,
      "hand": "Правый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2026,
    "sku": "76",
    "category": "sticks",
    "type": "replica",
    "brand": "Bauer",
    "name": "Fuse (красная)",
    "specs": {
      "curve": "P28",
      "flex": 70,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2027,
    "sku": "77",
    "category": "sticks",
    "type": "replica",
    "brand": "Bauer",
    "name": "FlyLite (оранжевая)",
    "specs": {
      "curve": "P28",
      "flex": 70,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2028,
    "sku": "78",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Recharge",
    "specs": {
      "curve": "P28",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2029,
    "sku": "79",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Vizion 2",
    "specs": {
      "curve": "P28",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2030,
    "sku": "80",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Recharge",
    "specs": {
      "curve": "P29",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2031,
    "sku": "81",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Trigger 10",
    "specs": {
      "curve": "P29",
      "flex": 70,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2032,
    "sku": "82",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Unleshed",
    "specs": {
      "curve": "P28",
      "flex": 70,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2033,
    "sku": "83",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Ft9 (розовая)",
    "specs": {
      "curve": "P28",
      "flex": 85,
      "hand": "Правый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2034,
    "sku": "84",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Recharge",
    "specs": {
      "curve": "P29",
      "flex": 85,
      "hand": "Правый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2035,
    "sku": "85",
    "category": "sticks",
    "type": "replica",
    "brand": "Bauer",
    "name": "Fuse (красная)",
    "specs": {
      "curve": "P28",
      "flex": 77,
      "hand": "Правый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2036,
    "sku": "86",
    "category": "sticks",
    "type": "replica",
    "brand": "CCM",
    "name": "Ft9 (триколор)",
    "specs": {
      "curve": "P28",
      "flex": 75,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2037,
    "sku": "87",
    "category": "sticks",
    "type": "replica",
    "brand": "Bauer",
    "name": "Flylite (триколор)",
    "specs": {
      "curve": "P28",
      "flex": 77,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 2038,
    "sku": "88",
    "category": "sticks",
    "type": "replica",
    "brand": "Bauer",
    "name": "Pulse (красная)",
    "specs": {
      "curve": "P92",
      "flex": 77,
      "hand": "Левый"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 3001,
    "sku": "1",
    "category": "elbows",
    "brand": "Союз",
    "name": "",
    "specs": {
      "size": "13"
    },
    "price": 8000,
    "inStock": true,
    "photos": []
  },
  {
    "id": 3002,
    "sku": "2",
    "category": "gloves",
    "brand": "CCM",
    "name": "XF80",
    "specs": {
      "size": "13"
    },
    "price": 7500,
    "inStock": true,
    "photos": []
  },
  {
    "id": 3003,
    "sku": "3",
    "category": "gloves",
    "brand": "Bauer",
    "name": "",
    "specs": {
      "size": "13"
    },
    "price": 8000,
    "inStock": true,
    "photos": []
  }
];
