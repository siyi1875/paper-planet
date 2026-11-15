"""Lookup tables: GDELT uses FIPS 10-4 country codes; the page wants ISO-3166 alpha-2
flags and a continent for spreading stories around the globe."""

# FIPS 10-4 -> ISO 3166-1 alpha-2. Only the codes that differ or matter are listed
# exhaustively; unknown codes fall back to the globe flag.
FIPS_TO_ISO = {
    "AF":"AF","AL":"AL","AG":"DZ","AN":"AD","AO":"AO","AC":"AG","AR":"AR","AM":"AM","AA":"AW",
    "AS":"AU","AU":"AT","AJ":"AZ","BF":"BS","BA":"BH","BG":"BD","BB":"BB","BO":"BY","BE":"BE",
    "BH":"BZ","BN":"BJ","BD":"BM","BT":"BT","BL":"BO","BK":"BA","BC":"BW","BR":"BR","BX":"BN",
    "BU":"BG","UV":"BF","BY":"BI","CB":"KH","CM":"CM","CA":"CA","CV":"CV","CJ":"KY","CT":"CF",
    "CD":"TD","CI":"CL","CH":"CN","CO":"CO","CN":"KM","CG":"CD","CF":"CG","CW":"CK","CS":"CR",
    "IV":"CI","HR":"HR","CU":"CU","UC":"CW","CY":"CY","EZ":"CZ","DA":"DK","DJ":"DJ","DO":"DM",
    "DR":"DO","EC":"EC","EG":"EG","ES":"SV","EK":"GQ","ER":"ER","EN":"EE","WZ":"SZ","ET":"ET",
    "FK":"FK","FO":"FO","FJ":"FJ","FI":"FI","FR":"FR","FG":"GF","FP":"PF","GB":"GA","GA":"GM",
    "GG":"GE","GM":"DE","GH":"GH","GI":"GI","GR":"GR","GL":"GL","GJ":"GD","GP":"GP","GQ":"GU",
    "GT":"GT","GK":"GG","GV":"GN","PU":"GW","GY":"GY","HA":"HT","HO":"HN","HK":"HK","HU":"HU",
    "IC":"IS","IN":"IN","ID":"ID","IR":"IR","IZ":"IQ","EI":"IE","IM":"IM","IS":"IL","IT":"IT",
    "JM":"JM","JA":"JP","JE":"JE","JO":"JO","KZ":"KZ","KE":"KE","KR":"KI","KN":"KP","KS":"KR",
    "KV":"XK","KU":"KW","KG":"KG","LA":"LA","LG":"LV","LE":"LB","LT":"LS","LI":"LR","LY":"LY",
    "LS":"LI","LH":"LT","LU":"LU","MC":"MO","MK":"MK","MA":"MG","MI":"MW","MY":"MY","MV":"MV",
    "ML":"ML","MT":"MT","RM":"MH","MB":"MQ","MR":"MR","MP":"MU","MF":"YT","MX":"MX","FM":"FM",
    "MD":"MD","MN":"MC","MG":"MN","MJ":"ME","MH":"MS","MO":"MA","MZ":"MZ","BM":"MM","WA":"NA",
    "NR":"NR","NP":"NP","NL":"NL","NC":"NC","NZ":"NZ","NU":"NI","NG":"NE","NI":"NG","NE":"NU",
    "NF":"NF","CQ":"MP","NO":"NO","MU":"OM","PK":"PK","PS":"PW","WE":"PS","GZ":"PS","PM":"PA",
    "PP":"PG","PA":"PY","PE":"PE","RP":"PH","PC":"PN","PL":"PL","PO":"PT","RQ":"PR","QA":"QA",
    "RE":"RE","RO":"RO","RS":"RU","RW":"RW","SH":"SH","SC":"KN","ST":"LC","SB":"PM","VC":"VC",
    "WS":"WS","SM":"SM","TP":"ST","SA":"SA","SG":"SN","RI":"RS","SE":"SC","SL":"SL","SN":"SG",
    "LO":"SK","SI":"SI","BP":"SB","SO":"SO","SF":"ZA","SX":"GS","OD":"SS","SP":"ES","CE":"LK",
    "SU":"SD","NS":"SR","SV":"SJ","SW":"SE","SZ":"CH","SY":"SY","TW":"TW","TI":"TJ","TZ":"TZ",
    "TH":"TH","TT":"TL","TO":"TG","TL":"TK","TN":"TO","TD":"TT","TS":"TN","TU":"TR","TX":"TM",
    "TK":"TC","TV":"TV","UG":"UG","UP":"UA","AE":"AE","UK":"GB","US":"US","UY":"UY","UZ":"UZ",
    "NH":"VU","VT":"VA","VE":"VE","VM":"VN","VI":"VG","VQ":"VI","WF":"WF","WI":"EH","YM":"YE",
    "ZA":"ZM","ZI":"ZW","AQ":"AS","AV":"AI","CR":"CX","CK":"CC","HM":"HM","IO":"IO","AY":"AQ",
}

_CONTINENTS = {
    "africa": "DZ AO BJ BW BF BI CV CM CF TD KM CD CG CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU YT MA MZ NA NE NG RE RW SH ST SN SC SL SO ZA SS SD TZ TG TN UG EH ZM ZW",
    "asia": "AF AM AZ BH BD BT BN KH CN CY GE HK IN ID IR IQ IL JP JO KZ KW KG LA LB MO MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TR TM AE UZ VN YE XK",
    "europe": "AL AD AT BY BE BA BG HR CZ DK EE FO FI FR DE GI GR GG HU IS IE IM IT JE XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SJ SE CH UA GB VA",
    "north_america": "AI AG AW BS BB BZ BM VG CA KY CR CU CW DM DO SV GL GD GP GT HT HN JM MQ MX MS NI PA PR BL KN LC PM VC TT TC US VI",
    "south_america": "AR BO BR CL CO EC FK GF GY PY PE SR UY VE",
    "oceania": "AS AU CK FJ PF GU KI MH FM NR NC NZ NU NF MP PW PG PN WS SB TK TO TV VU WF",
}
ISO_TO_CONTINENT = {}
for _c, _codes in _CONTINENTS.items():
    for _code in _codes.split():
        ISO_TO_CONTINENT.setdefault(_code, _c)
# Kosovo and Cyprus straddle lists above; pin them where readers expect them.
ISO_TO_CONTINENT["XK"] = "europe"
ISO_TO_CONTINENT["CY"] = "europe"
ISO_TO_CONTINENT["TR"] = "asia"
ISO_TO_CONTINENT["RU"] = "europe"

def iso_from_fips(fips):
    return FIPS_TO_ISO.get((fips or "").upper())

def flag_from_iso(iso):
    if not iso or len(iso) != 2 or not iso.isalpha():
        return "🌐"
    return "".join(chr(0x1F1E6 + ord(ch) - ord("A")) for ch in iso.upper())

def continent_from_iso(iso):
    return ISO_TO_CONTINENT.get(iso or "", "other")
