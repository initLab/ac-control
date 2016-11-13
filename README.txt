GET /status - shows status
GET /config?on=var_ON&mode=var_MODE&temp=var_TEMP&fan=var_FAN - changes config

AC models:
1 = Neo
2 = Midea
3 = Sang

var_ON:
0 = off
1 = on

var_MODE:
Neo:
0 = COOL
1 = DRY
2 = VENT
3 = HEAT

Midea:
0 = COOL
1 = DRY
2 = AUTO
3 = HEAT

Sang:
1 = HEAT
2 = DRY,
3 = COOL,
7 = FAN
8 = FEEL

var_TEMP: degrees celsius
Neo: 15-30
Midea: 17-30
Sang: 17-31

var_FAN:
Neo:
0 = AUTO
1 = HIGH
2 = MEDIUM
3 = LOW

Midea:
3 = HIGH
9 = LOW
11 = AUTO

Sang:
0 = AUTO
1 = SLEEP
2 = LOW
3 = MEDIUM
5 = HIGH
