function ocitajOkruzenje () {
    temperatura = BME280.temperature(BME280_T.T_C)
    vlaznostVazduha = BME280.humidity()
    pritisak = BME280.pressure(BME280_P.Pa)
}
function prikaziStanje () {
    if (trenutnoStanje == 2) {
        basic.showIcon(IconNames.Sad)
        pins.digitalWritePin(DigitalPin.P8, 1)
        pins.digitalWritePin(DigitalPin.P2, 0)
        pins.digitalWritePin(DigitalPin.P1, 0)
        if (prethodnoStanje != 2) {
            alarmJednom()
        }
    } else if (trenutnoStanje == 1) {
        basic.showIcon(IconNames.Asleep)
        pins.digitalWritePin(DigitalPin.P8, 0)
        pins.digitalWritePin(DigitalPin.P2, 1)
        pins.digitalWritePin(DigitalPin.P1, 0)
    } else {
        basic.showIcon(IconNames.Happy)
        pins.digitalWritePin(DigitalPin.P8, 0)
        pins.digitalWritePin(DigitalPin.P2, 0)
        pins.digitalWritePin(DigitalPin.P1, 1)
    }
}
function ocitajKvalitetVazduha () {
    pins.i2cWriteNumber(
    90,
    2,
    NumberFormat.UInt8BE,
    true
    )
    let data = pins.i2cReadBuffer(0x5A, 4)
if (data.length == 4) {
        eCO2 = (data[0] << 8) | data[1]
TVOC = (data[2] << 8) | data[3]
    }
}
function startCCS811 () {
    pins.i2cWriteNumber(
    90,
    244,
    NumberFormat.UInt8BE,
    false
    )
}
function inicijalizujCCS811 () {
    pins.i2cWriteBuffer(0x5A, pins.createBufferFromArray([0x01, 0x10]))
}
function alarmJednom () {
    music.playTone(523, 120)
    basic.pause(80)
    music.playTone(659, 120)
    basic.pause(80)
    music.playTone(784, 120)
}
function ispisiSerijski () {
    serial.writeLine("Temp: " + temperatura + " C")
    serial.writeLine("Humidity: " + vlaznostVazduha + " %")
    serial.writeLine("Pressure: " + pritisak + " Pa")
    serial.writeLine("eCO2 RAW: " + eCO2)
    serial.writeLine("eCO2 AVG: " + eCO2_avg)
    serial.writeLine("TVOC RAW: " + TVOC)
    serial.writeLine("TVOC AVG: " + TVOC_avg)
    serial.writeLine("State: " + trenutnoStanje)
    serial.writeLine("----------------")
}
function kompenzujCCS811 () {
    hum = vlaznostVazduha * 512
    temp = (temperatura + 25) * 512
    let buffer = pins.createBuffer(5)
buffer[0] = 5
    buffer[1] = (hum >> 8) & 0xFF
    buffer[2] = hum & 0xFF
    buffer[3] = (temp >> 8) & 0xFF
    buffer[4] = temp & 0xFF
    pins.i2cWriteBuffer(0x5A, buffer)
}
let stabilniBrojac = 0
let novoStanje = 0
let counter = 0
let temp = 0
let hum = 0
let TVOC_avg = 0
let prethodnoStanje = 0
let trenutnoStanje = 0
let pritisak = 0
let vlaznostVazduha = 0
let temperatura = 0
let eCO2_avg = 0
let TVOC = 0
let eCO2 = 0
eCO2_avg = 400
startCCS811()
basic.pause(2000)
inicijalizujCCS811()
basic.pause(1000)
basic.forever(function () {
    ocitajOkruzenje()
    ocitajKvalitetVazduha()
    // spike filter
    if (eCO2 > 4000) {
        eCO2 = eCO2_avg
    }
    if (TVOC > 800) {
        TVOC = TVOC_avg
    }
    // brzi filter
    eCO2_avg = (eCO2_avg * 2 + eCO2) / 3
    TVOC_avg = (TVOC_avg * 2 + TVOC) / 3
    counter += 1
    if (counter % 5 == 0) {
        kompenzujCCS811()
    }
    ispisiSerijski()
    // logika stanja (sva 3 parametra)
    novoStanje = trenutnoStanje
    if (eCO2 > 1500 || eCO2_avg > 1200 || TVOC > 220 || TVOC_avg > 200 || vlaznostVazduha > 70) {
        novoStanje = 2
    } else if (eCO2 > 900 || eCO2_avg > 800 || TVOC > 140 || TVOC_avg > 120 || vlaznostVazduha > 60) {
        novoStanje = 1
    } else {
        novoStanje = 0
    }
    // debounce
    if (novoStanje == trenutnoStanje) {
        stabilniBrojac = 0
    } else {
        stabilniBrojac += 1
    }
    if (stabilniBrojac >= 2) {
        trenutnoStanje = novoStanje
        stabilniBrojac = 0
    }
    prikaziStanje()
    prethodnoStanje = trenutnoStanje
    basic.pause(2000)
})
