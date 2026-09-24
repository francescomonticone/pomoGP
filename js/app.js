/* ════════════════════════════════════════════════════════════
   PomoGP · app.js (vanilla, nessun build)
   - Timer preciso con timestamp (performance.now), mai setInterval che accumula errore
   - rAF per avanzamento fluido del tracciato; setInterval 1s solo per tab title in background
   - Stato persistito in localStorage (impostazioni + pilota + circuito)
   ════════════════════════════════════════════════════════════ */
'use strict';

const STORE_KEY = 'pomogp:v2';
const F1_RED = '#E10600';
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Stato ---------- */
const defaults = {
  driverId: null, circuitId: 'monza',
  focusMin: 25, shortMin: 5, longMin: 15, lapsBeforeLong: 4,
  autoStart: true, audio: false, notify: false, compound: 'medium', pitRadio: true,
};
let settings = load();
let drivers = [];
let circuits = [];

/* Dati di riserva incorporati: l'app funziona anche aperta come file://
   (dove fetch dei JSON è bloccato dal browser). Via server http vengono
   comunque caricati i dataset completi da data/*.json. */
const FALLBACK_DRIVERS = [
  { id: 'leclerc', number: 16, pitRadio: "assets/radio/leclerc.mp3", "photo": "assets/drivers/leclerc.png", name: 'Charles Leclerc', team: 'Scuderia Ferrari', color: '#E10600', radioStart: 'Focus full attack — we are on plan A.', radioMid: 'Good pace, keep pushing, keep pushing.', radioEnd: 'P1! Grazie ragazzi, that was amazing!' },
  { id: 'hamilton', number: 44, pitRadio: "assets/radio/hamilton.mp3", "photo": "assets/drivers/hamilton.png", name: 'Lewis Hamilton', team: 'Scuderia Ferrari', color: '#DA291C', radioStart: "It's hammer time. Maximum focus.", radioMid: 'Bono, the tyres feel great. Keep them coming.', radioEnd: 'Get in there! What a stint, guys!' },
  { id: 'verstappen', number: 1, pitRadio: "assets/radio/verstappen.mp3", "photo": "assets/drivers/verstappen.png", name: 'Max Verstappen', team: 'Red Bull Racing', color: '#1E41FF', radioStart: 'Head down, full send from lap one.', radioMid: 'Simply lovely pace. Keep it there.', radioEnd: 'Haha, yes boys! That was mega!' },
  { id: 'norris', number: 4, pitRadio: "assets/radio/norris.mp3", "photo": "assets/drivers/norris.png", name: 'Lando Norris', team: 'McLaren F1 Team', color: '#FF8000', radioStart: "Let's gooo! Smooth operations.", radioMid: 'This is fun, the rhythm is unreal.', radioEnd: 'Wooohooo! Papaya on top, baby!' },
];
/* Tyre compounds: preset strategies (minutes). Custom values come from the wizard popup. */
const COMPOUNDS = {
  soft:   { focusMin: 15, shortMin: 3,  longMin: 9 },
  medium: { focusMin: 25, shortMin: 5,  longMin: 15 },
  hard:   { focusMin: 45, shortMin: 10, longMin: 30 },
};
/* Auto-generato da tools/convert.py — mirror di data/circuits.json per uso offline (file://). */
const FALLBACK_CIRCUITS = [{"id": "bahrain", "name": "Bahrain International Circuit", "country": "Bahrain", "lengthKm": 5.412, "path": "M 353.8 288.1 L 357.4 158.9 L 360.8 74.4 L 362.5 70.6 L 365.8 70.0 L 369.5 71.0 L 389.8 90.7 L 394.6 92.4 L 399.8 92.1 L 430.4 82.2 L 444.4 81.8 L 644.9 120.4 L 651.7 122.4 L 655.4 126.2 L 656.3 131.0 L 653.3 140.8 L 649.0 146.1 L 613.0 173.4 L 588.8 198.1 L 573.3 228.4 L 564.1 233.8 L 556.8 234.6 L 534.9 231.0 L 522.8 232.4 L 517.8 235.0 L 511.7 240.6 L 467.1 296.7 L 462.8 300.5 L 456.7 301.5 L 452.8 298.5 L 451.4 292.4 L 451.6 283.2 L 469.5 172.2 L 466.7 159.5 L 463.5 154.1 L 445.2 138.5 L 442.7 137.3 L 440.0 138.0 L 438.4 140.8 L 431.8 189.9 L 426.8 281.4 L 422.2 398.9 L 423.1 408.1 L 426.8 413.5 L 432.5 416.5 L 440.5 418.1 L 448.7 417.5 L 458.9 415.5 L 469.5 410.5 L 478.3 404.3 L 487.0 395.5 L 492.3 386.8 L 502.1 361.5 L 507.5 350.9 L 512.8 344.7 L 519.6 339.0 L 527.8 334.0 L 539.3 331.2 L 551.8 331.0 L 560.7 333.0 L 603.8 354.1 L 610.2 358.7 L 615.7 364.1 L 621.8 374.8 L 621.8 379.8 L 619.1 385.0 L 613.6 390.2 L 606.1 395.9 L 369.3 527.6 L 365.0 529.8 L 358.1 530.0 L 355.1 527.2 L 344.6 505.1 L 343.7 496.3 L 346.9 388.2 Z"}, {"id": "jeddah", "name": "Jeddah Corniche Circuit", "country": "Saudi Arabia", "lengthKm": 6.174, "path": "M 523.8 424.2 L 500.2 355.5 L 498.8 354.3 L 497.7 354.2 L 492.2 355.9 L 490.8 355.6 L 489.5 354.9 L 488.5 353.6 L 487.9 351.7 L 488.9 346.3 L 492.9 334.0 L 493.4 328.6 L 486.5 288.0 L 486.0 281.7 L 484.9 279.7 L 479.4 277.5 L 474.8 274.2 L 472.0 269.8 L 470.6 265.4 L 470.3 260.1 L 471.1 256.0 L 477.4 244.8 L 478.0 241.5 L 477.6 236.5 L 475.7 228.2 L 473.3 224.4 L 465.0 217.8 L 463.9 214.0 L 464.2 197.9 L 464.8 194.4 L 468.3 189.9 L 471.1 188.0 L 479.5 184.7 L 481.7 181.1 L 484.1 168.3 L 488.5 155.2 L 490.3 141.2 L 489.2 109.9 L 487.3 77.6 L 486.5 75.5 L 484.6 72.9 L 482.2 71.3 L 478.5 70.0 L 474.8 70.6 L 469.9 73.5 L 467.8 77.4 L 466.8 82.7 L 467.0 87.5 L 468.0 91.4 L 476.5 105.6 L 479.0 112.2 L 479.9 116.4 L 480.6 122.3 L 479.9 132.1 L 478.0 137.6 L 470.6 153.4 L 469.5 159.3 L 469.6 166.5 L 468.5 168.8 L 466.8 170.8 L 464.1 172.3 L 458.3 174.0 L 454.3 177.5 L 452.4 180.5 L 450.7 188.4 L 450.5 198.4 L 450.9 202.9 L 451.6 207.8 L 453.6 213.8 L 462.4 233.5 L 464.2 240.7 L 465.0 247.2 L 464.4 265.4 L 465.5 271.5 L 467.7 278.2 L 469.7 282.4 L 479.8 299.3 L 482.0 304.9 L 484.4 313.4 L 485.5 326.7 L 485.3 333.2 L 483.2 346.9 L 481.5 352.2 L 481.7 354.4 L 482.3 356.7 L 484.1 359.2 L 490.3 364.4 L 492.5 367.1 L 494.5 370.7 L 497.5 384.2 L 497.5 387.7 L 496.2 391.7 L 483.9 415.3 L 481.6 420.9 L 479.8 427.4 L 479.1 432.0 L 478.9 436.2 L 479.7 445.7 L 487.4 473.4 L 490.7 480.7 L 495.4 489.4 L 503.0 499.6 L 508.9 506.3 L 516.5 513.1 L 538.7 528.3 L 542.8 530.0 L 545.6 529.2 L 548.0 527.7 L 549.5 525.1 L 549.4 522.3 L 537.9 468.9 L 530.4 443.7 Z"}, {"id": "melbourne", "name": "Albert Park Circuit", "country": "Australia", "lengthKm": 5.278, "path": "M 460.5 409.7 L 400.5 349.7 L 399.7 345.7 L 403.4 338.3 L 405.4 328.5 L 404.3 316.9 L 402.8 312.9 L 397.6 305.5 L 373.8 282.9 L 356.2 264.2 L 336.2 238.7 L 316.1 205.0 L 310.9 193.8 L 311.1 191.1 L 312.3 189.2 L 315.0 187.8 L 342.0 182.6 L 346.2 179.7 L 347.5 175.9 L 347.8 171.9 L 346.2 125.2 L 350.2 119.8 L 379.9 98.4 L 385.7 95.0 L 423.1 80.4 L 439.4 70.6 L 445.0 70.0 L 459.1 81.7 L 465.6 84.1 L 487.9 86.4 L 495.0 88.9 L 501.3 91.9 L 512.9 101.2 L 517.6 107.2 L 522.0 114.7 L 524.4 122.4 L 533.1 167.7 L 533.1 172.0 L 532.4 177.2 L 528.7 187.0 L 518.3 200.9 L 514.9 208.4 L 506.5 250.8 L 505.6 260.9 L 506.1 275.1 L 507.1 282.2 L 511.5 298.2 L 517.9 311.2 L 526.9 325.0 L 534.2 332.6 L 562.0 356.8 L 568.2 360.0 L 573.3 361.5 L 599.1 361.6 L 606.6 364.3 L 609.2 365.8 L 650.2 400.5 L 658.6 410.4 L 662.5 416.5 L 666.5 425.7 L 680.9 473.1 L 689.0 505.6 L 689.1 507.6 L 687.5 508.4 L 634.6 529.4 L 625.9 530.0 L 622.1 528.4 L 616.0 523.8 L 599.4 494.0 L 588.2 476.9 L 584.9 476.4 L 583.5 477.2 L 567.8 494.8 L 563.2 498.4 L 557.7 500.1 L 555.3 500.1 L 548.6 498.2 L 544.6 495.1 Z"}, {"id": "suzuka", "name": "Suzuka International Racing Course", "country": "Japan", "lengthKm": 5.807, "path": "M 804.4 315.5 L 925.2 462.5 L 930.0 478.3 L 929.9 485.7 L 921.7 513.5 L 918.3 519.3 L 909.1 526.1 L 901.5 528.0 L 894.6 527.7 L 887.1 525.2 L 880.0 519.7 L 836.3 453.1 L 829.3 447.3 L 814.4 443.8 L 795.4 443.7 L 785.9 441.0 L 779.2 436.3 L 774.1 430.1 L 771.7 424.1 L 763.2 392.0 L 759.6 383.8 L 754.0 376.7 L 739.0 368.0 L 730.5 366.4 L 708.5 366.1 L 698.3 364.1 L 691.4 360.9 L 684.2 355.3 L 678.9 347.6 L 675.6 339.8 L 674.2 325.3 L 688.1 284.0 L 687.2 271.0 L 684.3 263.5 L 680.1 257.1 L 672.0 251.4 L 650.4 240.2 L 640.0 236.1 L 621.6 232.2 L 599.7 232.4 L 591.6 234.5 L 564.3 247.5 L 552.0 257.5 L 499.9 319.0 L 493.5 320.5 L 430.7 325.3 L 426.7 322.6 L 425.0 318.0 L 415.3 277.5 L 401.1 196.2 L 400.5 189.8 L 402.5 176.4 L 418.8 137.2 L 416.3 131.4 L 413.2 129.3 L 406.2 128.4 L 402.3 131.0 L 366.5 188.1 L 360.4 195.1 L 346.2 206.7 L 336.7 211.7 L 326.8 214.7 L 293.1 217.8 L 280.8 216.9 L 250.0 209.2 L 220.6 197.3 L 201.5 184.5 L 181.7 164.8 L 175.1 155.2 L 169.1 144.7 L 154.4 105.7 L 146.5 88.7 L 142.5 81.9 L 137.1 76.8 L 129.9 73.6 L 121.4 72.0 L 101.8 73.6 L 83.5 79.3 L 76.2 84.9 L 71.7 92.0 L 70.0 98.9 L 70.5 107.6 L 75.4 120.6 L 90.3 135.3 L 130.1 167.5 L 165.5 190.5 L 203.5 209.1 L 284.7 239.1 L 434.7 290.2 L 442.8 290.4 L 459.6 286.5 L 474.5 280.8 L 499.8 266.9 L 511.7 257.7 L 564.5 208.7 L 588.5 191.6 L 593.4 192.6 L 605.2 202.8 L 609.3 204.0 L 613.1 203.2 L 617.6 200.3 L 633.2 187.7 L 642.4 183.9 L 664.2 183.5 L 675.4 185.8 L 695.9 194.6 L 707.8 202.5 L 729.3 224.5 Z"}, {"id": "shanghai", "name": "Shanghai International Circuit", "country": "China", "lengthKm": 5.451, "path": "M 376.0 481.9 L 336.2 491.8 L 320.2 492.5 L 307.1 487.8 L 300.1 483.3 L 291.1 473.7 L 285.8 461.5 L 285.8 447.6 L 288.4 436.6 L 296.0 427.8 L 305.7 423.6 L 314.6 423.6 L 321.7 426.3 L 324.6 429.4 L 326.5 432.8 L 326.7 437.5 L 321.7 458.6 L 323.4 462.9 L 327.5 467.4 L 334.5 470.0 L 342.3 468.5 L 346.4 465.8 L 351.5 456.8 L 355.4 444.0 L 355.9 436.4 L 354.6 429.9 L 348.1 418.2 L 340.1 408.5 L 318.7 385.9 L 302.3 364.5 L 271.7 330.9 L 263.9 315.4 L 240.9 249.1 L 235.8 230.3 L 238.0 227.1 L 242.4 225.3 L 249.9 226.7 L 264.2 237.2 L 279.9 253.6 L 287.9 265.3 L 327.0 332.0 L 339.8 345.7 L 356.4 353.1 L 365.1 354.9 L 375.2 354.9 L 392.9 350.0 L 401.7 344.5 L 409.9 337.8 L 416.4 330.2 L 434.4 292.2 L 439.0 285.3 L 443.9 280.6 L 458.9 273.1 L 474.7 273.1 L 487.0 279.4 L 494.8 286.9 L 512.7 321.4 L 517.1 326.1 L 522.4 327.7 L 532.1 325.0 L 550.1 301.4 L 552.5 296.7 L 551.0 288.2 L 449.7 120.7 L 445.6 119.4 L 441.4 120.5 L 428.6 134.4 L 419.4 138.7 L 414.0 137.8 L 408.7 133.1 L 399.2 120.5 L 396.3 107.7 L 398.1 94.0 L 400.2 87.7 L 406.0 80.1 L 411.6 75.8 L 419.4 72.4 L 434.2 70.0 L 452.6 72.9 L 466.4 79.6 L 476.1 88.6 L 764.2 522.4 L 763.9 526.9 L 760.8 530.0 L 755.7 529.6 L 745.2 524.6 L 732.4 515.4 L 661.4 419.1 L 658.2 417.3 L 652.4 416.8 L 563.4 437.7 Z"}, {"id": "miami", "name": "Miami International Autodrome", "country": "USA", "lengthKm": 5.412, "path": "M 494.4 225.0 L 611.9 297.8 L 613.9 303.2 L 609.6 314.8 L 584.5 333.3 L 576.8 341.6 L 574.2 356.7 L 576.8 372.6 L 574.3 392.3 L 568.3 404.9 L 545.6 422.9 L 519.8 431.8 L 503.0 435.5 L 478.3 436.1 L 458.9 432.6 L 436.1 422.5 L 304.3 343.9 L 286.0 341.6 L 276.3 342.9 L 263.9 346.8 L 253.5 352.6 L 231.8 368.5 L 217.2 370.9 L 204.1 369.7 L 190.0 362.9 L 164.8 339.3 L 151.3 332.7 L 137.3 329.9 L 105.2 337.6 L 92.2 343.7 L 82.7 352.5 L 73.6 366.6 L 70.0 381.7 L 70.4 394.3 L 73.2 402.7 L 77.8 408.6 L 87.3 413.7 L 98.7 413.7 L 112.8 410.6 L 128.5 410.6 L 220.4 429.4 L 375.7 423.8 L 494.2 463.3 L 530.3 469.3 L 566.5 469.8 L 604.6 463.6 L 764.9 405.2 L 787.1 395.4 L 843.9 365.4 L 874.5 346.0 L 880.6 337.8 L 878.6 331.0 L 849.2 310.0 L 843.9 299.3 L 842.7 288.3 L 845.9 274.8 L 853.4 267.3 L 862.3 263.7 L 888.6 265.3 L 901.7 263.5 L 916.3 251.3 L 930.0 227.0 L 929.1 221.7 L 916.4 214.6 L 916.2 205.6 L 927.1 170.7 L 926.2 164.8 L 921.3 160.8 L 893.9 158.3 L 498.7 144.4 L 183.5 130.2 L 174.3 132.6 L 172.3 139.8 L 175.5 148.8 L 203.4 171.3 L 221.7 181.0 L 236.6 184.7 L 249.7 183.7 L 303.1 160.5 L 324.1 154.9 L 349.8 152.7 L 375.3 156.2 L 399.2 166.2 Z"}, {"id": "imola", "name": "Autodromo Enzo e Dino Ferrari", "country": "Italy", "lengthKm": 4.909, "path": "M 615.6 130.9 L 600.3 130.7 L 505.2 110.4 L 471.2 106.8 L 451.4 106.6 L 352.2 115.4 L 303.4 126.9 L 297.4 130.9 L 294.5 134.4 L 290.0 153.2 L 287.4 158.1 L 236.5 184.9 L 229.8 192.4 L 157.4 370.5 L 156.7 381.1 L 164.3 408.8 L 164.3 413.1 L 159.0 422.2 L 73.3 495.0 L 70.0 504.1 L 71.1 509.4 L 74.2 515.8 L 78.3 519.3 L 83.0 520.7 L 244.0 501.6 L 284.1 505.4 L 342.8 516.4 L 356.3 511.9 L 363.9 504.6 L 371.5 491.0 L 383.1 462.1 L 385.8 449.5 L 386.7 435.1 L 384.4 420.5 L 367.6 341.3 L 367.8 336.4 L 370.2 330.7 L 392.8 295.5 L 401.6 293.1 L 424.0 302.2 L 429.9 302.9 L 629.1 301.7 L 631.7 302.7 L 636.0 313.8 L 642.4 315.2 L 721.9 282.6 L 732.0 277.1 L 765.1 254.4 L 847.3 175.2 L 866.3 164.0 L 924.9 138.1 L 929.4 133.8 L 930.0 127.1 L 928.8 121.7 L 911.1 84.5 L 907.0 81.0 L 896.1 79.3 L 768.8 126.6 L 746.6 131.2 Z"}, {"id": "monaco", "name": "Circuit de Monaco", "country": "Monaco", "lengthKm": 3.337, "path": "M 550.6 236.7 L 557.7 234.2 L 566.3 228.8 L 578.0 214.6 L 579.9 207.7 L 578.3 193.9 L 575.6 186.4 L 572.1 179.4 L 556.1 165.4 L 552.8 155.2 L 553.9 150.9 L 559.3 141.0 L 611.4 71.2 L 615.7 70.0 L 620.9 71.5 L 624.5 74.4 L 627.1 79.0 L 628.1 92.1 L 641.7 115.2 L 645.8 117.9 L 650.8 114.8 L 651.5 111.7 L 635.7 92.8 L 634.1 86.4 L 636.1 81.7 L 663.6 71.7 L 670.2 71.3 L 673.6 73.0 L 674.9 78.4 L 673.7 109.7 L 668.9 141.9 L 663.8 162.4 L 658.2 177.0 L 648.6 193.8 L 621.4 225.3 L 598.4 239.3 L 558.3 258.2 L 540.6 264.3 L 488.5 274.8 L 485.2 284.8 L 481.4 286.1 L 476.1 287.0 L 470.1 283.7 L 466.9 283.4 L 368.7 297.2 L 364.7 297.9 L 361.9 300.8 L 353.5 318.2 L 349.1 332.9 L 347.7 343.5 L 347.8 366.2 L 351.8 372.3 L 361.7 380.3 L 363.4 384.2 L 373.1 437.4 L 371.2 442.6 L 363.7 447.1 L 362.8 449.7 L 363.5 455.2 L 371.8 477.3 L 382.7 494.5 L 391.3 503.2 L 408.3 511.7 L 412.2 519.9 L 411.2 523.1 L 408.0 525.0 L 393.7 528.7 L 385.8 530.0 L 375.9 529.4 L 371.1 525.4 L 369.0 513.3 L 350.5 487.0 L 334.8 436.5 L 329.8 411.7 L 325.1 368.7 L 327.1 328.0 L 333.4 306.5 L 333.7 291.8 L 335.0 289.4 L 338.3 287.9 L 346.4 285.9 L 389.6 280.5 L 438.1 266.7 L 465.0 263.2 L 509.0 244.1 L 538.0 238.8 Z"}, {"id": "barcelona", "name": "Circuit de Barcelona-Catalunya", "country": "Spain", "lengthKm": 4.657, "path": "M 608.9 275.4 L 465.1 503.2 L 456.5 510.4 L 444.9 509.9 L 428.6 500.5 L 418.2 499.2 L 411.5 500.7 L 407.8 503.0 L 379.6 523.9 L 366.1 529.2 L 356.5 530.0 L 346.1 529.0 L 334.5 524.2 L 325.5 516.8 L 318.2 507.4 L 312.1 492.0 L 310.8 479.5 L 312.1 464.7 L 318.5 442.8 L 322.1 435.2 L 375.0 351.7 L 382.0 346.6 L 389.7 344.7 L 398.5 346.4 L 403.0 349.0 L 411.4 356.8 L 415.3 364.6 L 417.1 379.7 L 415.4 391.4 L 407.8 406.8 L 372.2 462.0 L 371.2 469.0 L 373.7 475.7 L 378.3 479.9 L 381.9 481.1 L 389.1 480.7 L 444.7 455.9 L 452.1 451.3 L 466.9 438.7 L 472.1 432.4 L 493.4 399.2 L 496.7 390.8 L 495.8 385.4 L 493.1 380.5 L 473.9 366.6 L 466.5 356.4 L 437.9 289.0 L 436.7 276.6 L 438.3 267.1 L 441.3 261.7 L 448.5 252.7 L 453.4 248.9 L 623.7 162.1 L 629.6 158.8 L 634.3 152.3 L 633.4 144.2 L 631.4 140.8 L 624.3 134.8 L 613.4 130.9 L 602.6 129.9 L 592.1 131.6 L 584.5 135.2 L 564.7 149.7 L 559.8 151.9 L 552.0 152.5 L 547.5 151.5 L 537.6 145.1 L 532.7 136.0 L 531.8 128.3 L 533.3 121.3 L 536.0 116.3 L 584.8 75.7 L 594.4 71.2 L 607.1 70.0 L 612.9 71.2 L 673.3 108.6 L 681.2 115.2 L 686.2 123.2 L 689.2 134.4 L 688.1 149.0 L 682.5 160.0 Z"}, {"id": "montreal", "name": "Circuit Gilles-Villeneuve", "country": "Canada", "lengthKm": 4.361, "path": "M 550.8 403.1 L 560.8 448.7 L 563.1 463.1 L 563.4 474.9 L 559.8 506.6 L 560.4 510.4 L 563.0 512.8 L 572.5 516.9 L 574.3 518.3 L 575.3 521.1 L 573.6 526.6 L 571.0 528.7 L 567.8 530.0 L 558.9 529.0 L 540.1 523.3 L 526.0 514.9 L 500.6 492.5 L 498.8 489.8 L 498.3 487.5 L 500.7 477.1 L 499.2 472.4 L 481.0 450.4 L 468.0 440.3 L 464.0 435.0 L 461.8 429.4 L 459.6 418.9 L 459.8 381.7 L 458.5 379.4 L 456.3 377.7 L 452.4 376.8 L 444.1 378.4 L 440.5 377.4 L 435.1 373.3 L 431.9 368.2 L 430.2 363.5 L 427.1 350.2 L 424.7 317.8 L 425.0 303.6 L 426.3 279.6 L 429.0 261.8 L 438.3 224.3 L 439.9 220.9 L 442.2 219.6 L 450.6 217.9 L 453.2 216.4 L 458.1 210.1 L 460.0 205.5 L 469.2 168.1 L 472.9 147.9 L 474.1 133.6 L 474.6 114.3 L 467.0 74.0 L 467.2 72.3 L 468.8 70.5 L 471.8 70.0 L 473.7 70.6 L 475.5 73.4 L 477.8 95.9 L 479.3 100.1 L 488.5 118.8 L 513.0 182.5 L 546.9 343.6 L 546.6 345.7 L 545.2 347.4 L 542.6 348.4 L 540.2 351.9 L 546.3 381.1 Z"}, {"id": "spielberg", "name": "Red Bull Ring", "country": "Austria", "lengthKm": 4.318, "path": "M 622.3 482.1 L 446.4 529.4 L 437.7 530.0 L 432.0 524.8 L 422.2 506.2 L 358.2 417.9 L 332.0 376.4 L 308.1 335.4 L 258.3 228.2 L 241.7 201.7 L 216.3 170.8 L 135.0 89.8 L 132.6 84.6 L 132.9 79.1 L 137.4 76.4 L 179.6 70.9 L 244.7 70.0 L 312.6 78.9 L 424.1 100.3 L 474.9 106.9 L 584.8 111.5 L 593.8 114.6 L 599.3 120.7 L 601.4 127.4 L 600.8 134.5 L 598.0 141.1 L 578.3 167.1 L 562.3 181.2 L 544.7 190.7 L 523.5 197.7 L 500.4 201.3 L 476.3 199.8 L 382.6 184.8 L 370.0 186.4 L 359.8 190.0 L 350.9 196.2 L 343.0 204.4 L 338.0 214.2 L 335.4 224.9 L 336.4 245.3 L 339.3 253.2 L 384.7 332.0 L 392.3 340.3 L 404.4 347.9 L 418.3 351.0 L 431.7 349.8 L 445.8 344.0 L 454.5 337.0 L 471.8 315.3 L 480.7 306.1 L 491.5 298.8 L 504.1 291.4 L 521.6 285.0 L 540.0 281.0 L 808.9 275.5 L 820.4 279.6 L 829.9 286.6 L 837.5 296.0 L 843.2 308.5 L 867.4 391.9 L 863.4 401.1 L 842.7 415.1 L 810.2 430.1 L 789.7 436.8 Z"}, {"id": "silverstone", "name": "Silverstone Circuit", "country": "United Kingdom", "lengthKm": 5.891, "path": "M 526.3 74.4 L 576.7 70.0 L 585.7 70.5 L 592.6 72.8 L 597.0 75.8 L 602.4 81.9 L 605.8 89.0 L 616.3 127.6 L 618.6 143.9 L 622.3 208.6 L 634.0 233.4 L 632.8 243.5 L 624.3 265.8 L 623.7 274.8 L 625.0 281.3 L 636.5 298.4 L 638.4 303.8 L 638.7 310.1 L 637.2 315.9 L 632.1 322.2 L 609.6 336.1 L 604.7 340.9 L 526.5 483.2 L 500.8 521.9 L 496.2 525.9 L 490.8 528.6 L 485.2 530.0 L 474.4 528.3 L 469.6 526.2 L 465.4 522.8 L 461.7 517.5 L 455.2 503.6 L 449.1 493.0 L 438.0 479.0 L 424.2 464.5 L 404.4 441.0 L 402.4 439.7 L 399.7 439.4 L 397.0 440.7 L 388.7 448.2 L 385.8 449.2 L 380.6 447.9 L 377.2 444.7 L 369.1 435.1 L 365.8 428.8 L 363.5 422.3 L 361.3 412.0 L 361.9 409.1 L 367.4 400.1 L 441.3 304.6 L 444.2 301.4 L 449.1 298.2 L 455.0 296.8 L 459.8 296.6 L 497.5 301.0 L 511.3 298.3 L 517.2 295.1 L 555.6 264.7 L 561.2 261.5 L 564.4 261.2 L 569.0 264.0 L 570.3 266.3 L 576.8 289.0 L 578.8 292.3 L 581.5 294.2 L 584.7 294.4 L 588.2 292.8 L 591.8 287.1 L 594.5 279.6 L 598.3 267.1 L 599.2 261.1 L 599.3 248.1 L 598.0 245.2 L 469.9 128.3 L 461.9 123.8 L 456.1 123.0 L 450.1 123.7 L 443.9 126.6 L 441.8 129.3 L 440.2 133.3 L 437.7 153.8 L 436.3 158.0 L 433.2 161.4 L 428.6 163.6 L 423.6 164.3 L 418.0 162.9 L 414.1 160.3 L 411.7 157.2 L 409.8 153.5 L 409.5 149.6 L 410.3 145.3 L 429.4 106.8 L 434.6 100.8 L 446.8 89.5 L 452.7 85.4 L 466.6 80.3 L 480.2 78.6 Z"}, {"id": "spa", "name": "Circuit de Spa-Francorchamps", "country": "Belgium", "lengthKm": 7.004, "path": "M 443.4 118.8 L 417.9 74.6 L 417.6 72.6 L 418.7 70.8 L 421.1 70.0 L 423.7 70.7 L 452.5 84.6 L 462.3 90.6 L 481.6 105.7 L 527.7 159.6 L 530.5 162.2 L 543.6 170.5 L 547.2 174.1 L 550.3 179.0 L 553.7 188.5 L 554.8 197.7 L 556.6 204.0 L 590.2 258.0 L 595.8 270.6 L 642.7 432.7 L 642.4 439.4 L 640.5 442.2 L 632.2 448.4 L 629.7 454.2 L 629.9 457.7 L 634.6 478.7 L 633.7 485.6 L 631.2 489.2 L 628.2 491.6 L 574.5 528.5 L 571.1 529.9 L 567.7 530.0 L 564.1 529.0 L 561.2 526.8 L 559.1 523.8 L 558.1 517.5 L 561.0 511.3 L 587.2 494.7 L 589.7 492.1 L 591.1 489.5 L 591.4 482.8 L 581.7 454.4 L 578.7 442.9 L 568.4 386.7 L 566.0 379.5 L 560.3 373.2 L 552.4 369.1 L 534.0 367.4 L 528.7 368.0 L 518.8 371.5 L 510.0 378.5 L 507.0 382.9 L 503.7 389.1 L 478.6 451.4 L 476.0 456.0 L 473.0 459.1 L 468.9 461.5 L 464.7 462.6 L 460.9 462.8 L 457.0 461.9 L 444.6 455.4 L 440.3 454.7 L 432.0 456.4 L 428.6 458.8 L 423.8 465.1 L 402.1 499.0 L 397.3 502.4 L 394.1 503.1 L 390.5 502.9 L 387.4 501.5 L 364.0 484.5 L 359.6 478.3 L 357.3 471.2 L 357.8 462.4 L 364.2 445.1 L 369.3 436.1 L 374.9 428.2 L 383.3 418.8 L 397.5 405.1 L 405.7 398.7 L 449.2 375.7 L 454.4 372.5 L 464.1 364.3 L 471.7 354.7 L 476.6 345.7 L 491.2 312.7 L 492.1 308.0 L 492.3 302.2 L 491.4 296.9 L 473.1 249.3 L 469.6 234.0 L 467.9 219.7 L 465.8 189.4 L 466.2 187.4 L 467.5 186.0 L 469.3 185.6 L 472.5 186.0 L 478.1 185.6 L 479.6 183.9 L 480.0 182.1 L 467.5 160.8 Z"}, {"id": "budapest", "name": "Hungaroring", "country": "Hungary", "lengthKm": 4.381, "path": "M 397.4 416.5 L 298.5 338.4 L 295.3 331.6 L 297.1 324.9 L 302.2 321.5 L 306.5 320.9 L 330.2 321.3 L 352.6 326.4 L 363.8 330.8 L 378.7 340.0 L 441.0 388.9 L 445.6 391.3 L 454.4 392.3 L 461.9 389.7 L 465.0 387.3 L 470.7 378.4 L 471.1 370.6 L 468.5 363.1 L 450.7 333.0 L 448.5 323.1 L 450.9 314.5 L 507.2 200.9 L 513.5 189.8 L 529.9 169.5 L 533.2 163.5 L 533.5 160.2 L 516.6 96.7 L 516.2 92.1 L 517.9 83.3 L 519.8 79.2 L 527.2 72.8 L 531.5 70.6 L 541.0 70.0 L 552.2 73.8 L 575.9 90.5 L 616.2 133.5 L 617.7 136.9 L 618.0 142.3 L 611.4 149.4 L 610.7 155.0 L 623.4 203.3 L 626.0 209.3 L 632.3 215.9 L 665.7 221.6 L 670.8 223.6 L 676.7 228.0 L 679.1 231.8 L 681.0 243.5 L 674.0 291.0 L 674.4 303.4 L 677.6 313.1 L 701.7 351.3 L 704.1 357.1 L 704.7 364.8 L 703.4 372.8 L 699.0 380.0 L 620.7 468.5 L 608.2 482.4 L 605.1 484.2 L 599.5 484.2 L 597.1 482.8 L 569.7 452.4 L 546.4 432.9 L 539.6 429.7 L 535.5 429.1 L 527.2 431.7 L 521.1 441.2 L 521.3 449.2 L 523.0 453.0 L 525.2 456.0 L 570.0 492.6 L 573.6 500.8 L 574.2 506.3 L 573.7 511.5 L 570.0 520.0 L 561.5 527.0 L 550.2 530.0 L 543.9 529.2 L 533.0 523.4 Z"}, {"id": "zandvoort", "name": "Circuit Zandvoort", "country": "Netherlands", "lengthKm": 4.259, "path": "M 294.4 280.4 L 378.6 80.3 L 383.8 74.3 L 390.9 71.0 L 398.7 70.0 L 405.9 71.5 L 412.6 76.1 L 417.3 81.8 L 419.8 89.0 L 420.0 97.0 L 394.0 159.2 L 387.7 181.0 L 385.2 203.7 L 386.6 224.9 L 384.6 233.6 L 370.3 247.1 L 331.8 262.0 L 324.6 267.5 L 322.4 282.7 L 325.3 290.1 L 330.7 295.3 L 337.6 298.1 L 348.1 297.9 L 399.8 281.5 L 423.8 277.0 L 444.5 276.4 L 462.8 277.7 L 512.7 288.7 L 531.4 290.3 L 560.5 283.4 L 579.7 273.8 L 602.2 259.2 L 617.4 252.1 L 631.0 248.2 L 648.8 246.2 L 721.7 250.1 L 735.3 253.2 L 747.9 259.4 L 756.8 267.0 L 768.1 284.4 L 772.0 306.4 L 767.7 328.7 L 723.7 393.8 L 701.1 442.2 L 690.3 446.0 L 676.9 447.5 L 649.0 444.4 L 616.6 431.1 L 600.0 419.3 L 589.7 408.0 L 587.9 401.1 L 589.5 393.8 L 595.9 384.7 L 605.0 378.9 L 618.4 374.0 L 663.4 364.9 L 683.5 357.2 L 694.7 349.4 L 698.9 340.1 L 699.5 329.9 L 695.8 319.8 L 686.5 310.5 L 678.2 307.6 L 634.8 302.4 L 591.0 302.5 L 544.5 308.1 L 505.3 317.9 L 454.1 335.4 L 428.5 346.2 L 399.9 361.8 L 394.4 360.7 L 383.8 343.4 L 376.3 338.8 L 366.7 338.4 L 357.2 342.8 L 352.2 349.5 L 349.9 356.8 L 373.3 493.5 L 373.7 501.7 L 371.4 510.0 L 364.1 521.6 L 355.1 527.6 L 345.6 529.8 L 296.9 530.0 L 272.5 524.1 L 262.3 519.5 L 248.7 508.9 L 233.8 487.0 L 229.4 473.4 L 228.0 461.5 L 229.2 442.0 L 232.9 428.2 L 291.3 287.7 Z"}, {"id": "monza", "name": "Autodromo Nazionale Monza", "country": "Italy", "lengthKm": 5.793, "path": "M 374.5 362.2 L 385.8 233.1 L 386.2 231.5 L 387.3 230.6 L 393.4 230.6 L 395.4 227.7 L 389.8 205.8 L 389.1 200.2 L 388.8 195.1 L 391.2 162.4 L 393.0 153.8 L 398.7 139.9 L 402.0 134.7 L 410.1 125.5 L 420.7 117.1 L 426.7 113.7 L 433.5 110.3 L 447.8 105.9 L 456.2 104.5 L 498.6 100.8 L 542.3 98.1 L 544.7 96.3 L 546.0 91.6 L 547.6 89.3 L 561.0 86.5 L 608.3 70.8 L 614.8 70.0 L 620.0 71.4 L 624.0 74.0 L 627.9 78.8 L 628.8 81.3 L 634.0 136.4 L 632.8 139.7 L 629.1 142.4 L 564.3 177.9 L 552.3 186.6 L 455.8 270.9 L 452.0 275.4 L 452.7 290.2 L 451.6 294.8 L 448.4 300.8 L 439.0 309.8 L 437.1 315.4 L 432.9 350.1 L 415.5 516.4 L 413.4 521.9 L 411.6 524.1 L 406.4 528.1 L 399.2 530.0 L 392.9 529.1 L 385.9 526.2 L 380.3 522.1 L 376.9 518.4 L 372.4 511.5 L 369.0 502.6 L 367.7 497.9 L 366.5 487.5 L 366.0 442.4 L 372.1 381.8 Z"}, {"id": "baku", "name": "Baku City Circuit", "country": "Azerbaijan", "lengthKm": 6.003, "path": "M 766.2 187.8 L 812.6 168.1 L 815.1 166.1 L 816.9 160.5 L 816.2 156.5 L 806.7 132.3 L 790.8 101.6 L 777.6 71.9 L 772.7 70.0 L 674.0 108.5 L 536.1 170.6 L 531.9 175.0 L 531.9 180.9 L 552.8 234.7 L 553.0 238.9 L 549.7 242.5 L 513.4 259.6 L 492.8 270.8 L 465.1 288.4 L 463.4 290.7 L 468.7 304.0 L 468.5 306.9 L 455.7 318.3 L 392.6 366.8 L 377.4 379.5 L 372.9 379.3 L 369.2 375.3 L 352.5 326.5 L 350.5 324.4 L 343.4 323.8 L 337.4 320.1 L 333.7 319.1 L 326.1 319.6 L 322.1 318.0 L 320.1 314.9 L 316.5 303.4 L 312.3 299.7 L 308.6 299.5 L 282.0 308.7 L 239.7 329.2 L 211.7 345.9 L 206.1 350.4 L 201.8 356.2 L 197.7 364.4 L 184.0 410.8 L 183.1 417.0 L 187.6 481.1 L 188.9 485.1 L 192.3 489.1 L 249.7 518.9 L 274.6 529.2 L 279.5 530.0 L 285.3 529.0 L 291.9 523.4 L 313.3 484.3 L 317.9 478.3 L 367.2 433.7 L 371.2 428.1 L 373.3 422.6 L 377.6 393.2 L 379.5 387.5 L 383.2 382.0 L 458.5 323.4 L 468.1 317.2 L 488.9 306.6 L 719.0 207.4 Z"}, {"id": "singapore", "name": "Marina Bay Street Circuit", "country": "Singapore", "lengthKm": 4.927, "path": "M 842.2 244.7 L 831.7 169.3 L 826.8 109.8 L 824.9 102.7 L 821.8 98.3 L 815.5 95.8 L 803.4 97.0 L 793.7 94.3 L 782.2 88.7 L 777.2 84.5 L 766.2 70.8 L 756.0 70.0 L 749.6 76.4 L 745.0 86.9 L 742.4 125.8 L 743.9 135.2 L 766.9 195.7 L 772.1 222.6 L 773.5 242.5 L 772.3 250.8 L 767.5 259.6 L 759.9 264.9 L 750.7 269.2 L 743.6 270.5 L 561.6 259.9 L 547.0 257.2 L 525.9 249.2 L 384.6 169.0 L 380.3 170.5 L 375.9 177.1 L 351.6 217.9 L 330.3 259.1 L 326.9 259.9 L 322.8 257.8 L 276.8 209.9 L 256.8 196.8 L 246.7 198.8 L 243.7 201.2 L 236.4 207.9 L 142.2 375.3 L 142.5 382.8 L 143.9 391.5 L 146.9 397.6 L 155.3 404.9 L 174.9 418.0 L 190.7 423.3 L 192.2 427.1 L 189.2 433.1 L 187.4 445.0 L 191.7 459.4 L 195.9 465.3 L 213.7 481.9 L 240.4 504.0 L 244.7 513.4 L 256.4 529.0 L 263.8 530.0 L 271.4 526.6 L 274.6 521.6 L 316.6 311.4 L 325.7 283.6 L 333.8 277.3 L 345.4 277.0 L 421.4 342.6 L 433.9 348.7 L 446.0 351.9 L 463.3 354.0 L 676.8 365.3 L 678.5 368.2 L 678.8 383.0 L 682.4 392.4 L 692.2 400.4 L 701.0 402.7 L 769.8 410.0 L 828.4 412.4 L 831.8 410.8 L 834.9 406.4 L 856.4 373.7 L 857.8 366.8 L 856.4 352.8 Z"}, {"id": "austin", "name": "Circuit of the Americas", "country": "USA", "lengthKm": 5.513, "path": "M 258.2 445.6 L 331.2 503.3 L 366.9 526.6 L 375.0 530.0 L 377.5 529.6 L 381.3 525.9 L 381.8 521.3 L 357.6 448.5 L 357.6 436.6 L 361.1 423.0 L 368.4 410.8 L 373.7 404.8 L 447.3 358.7 L 457.0 347.0 L 465.6 324.9 L 472.4 315.9 L 499.4 302.8 L 503.9 299.3 L 509.2 291.3 L 512.5 270.3 L 516.0 258.8 L 521.8 249.6 L 530.6 240.9 L 550.2 229.8 L 565.3 228.4 L 571.9 230.3 L 617.7 251.0 L 622.0 251.0 L 633.6 244.5 L 643.4 236.7 L 662.8 213.9 L 667.6 210.2 L 676.9 207.0 L 682.7 207.0 L 694.2 211.6 L 700.5 218.3 L 704.8 225.7 L 707.8 228.9 L 711.4 230.3 L 795.0 212.1 L 800.2 208.4 L 897.9 89.8 L 904.0 78.8 L 903.7 73.5 L 899.7 70.5 L 894.4 70.0 L 810.1 96.5 L 753.9 112.2 L 692.0 127.1 L 618.0 141.8 L 528.8 155.7 L 402.7 169.5 L 388.6 172.0 L 386.8 173.2 L 386.3 177.3 L 396.4 189.0 L 425.1 228.2 L 438.4 251.5 L 435.9 258.8 L 429.9 261.8 L 424.6 262.5 L 401.2 260.6 L 394.9 255.4 L 386.3 234.2 L 383.0 229.6 L 365.4 212.1 L 344.8 209.1 L 340.0 210.5 L 337.5 215.3 L 338.5 218.5 L 379.5 290.6 L 380.3 302.5 L 378.0 312.2 L 370.2 331.1 L 367.1 335.0 L 356.3 341.5 L 327.6 353.4 L 305.7 351.8 L 288.9 345.8 L 275.8 337.3 L 244.8 293.1 L 223.4 266.4 L 217.4 262.2 L 209.3 261.6 L 192.4 267.1 L 104.0 305.6 L 99.0 309.0 L 96.0 315.7 L 99.0 320.5 L 147.9 359.9 Z"}, {"id": "mexico", "name": "Aut\u00f3dromo Hermanos Rodr\u00edguez", "country": "Mexico", "lengthKm": 4.304, "path": "M 296.1 78.8 L 507.1 107.5 L 561.5 112.4 L 655.4 125.1 L 773.4 142.5 L 797.7 147.3 L 804.0 150.8 L 805.4 156.6 L 801.6 188.1 L 803.0 190.4 L 819.0 199.0 L 820.9 202.0 L 818.4 222.9 L 814.5 239.1 L 808.5 254.8 L 801.6 269.0 L 747.4 360.2 L 678.3 468.4 L 678.6 476.0 L 680.6 478.6 L 701.8 492.3 L 700.7 497.8 L 661.2 527.9 L 654.6 530.0 L 645.2 524.9 L 644.1 516.6 L 660.6 388.2 L 660.4 384.3 L 656.2 377.6 L 633.1 363.0 L 622.0 352.6 L 613.4 333.1 L 604.0 321.3 L 591.0 314.6 L 531.3 305.5 L 524.7 303.5 L 518.6 297.7 L 509.3 270.6 L 502.9 261.5 L 449.1 232.1 L 436.3 226.8 L 417.8 222.4 L 266.7 199.9 L 263.7 195.1 L 257.9 127.2 L 254.6 122.1 L 251.5 120.7 L 247.6 121.2 L 238.2 132.8 L 231.6 136.4 L 227.5 136.2 L 212.0 130.0 L 186.9 127.2 L 182.7 125.8 L 179.1 121.2 L 180.5 111.0 L 184.1 101.5 L 195.7 84.1 L 203.7 77.6 L 213.9 72.5 L 223.3 70.0 L 245.7 71.4 Z"}, {"id": "saopaulo", "name": "Aut\u00f3dromo Jos\u00e9 Carlos Pace", "country": "Brazil", "lengthKm": 4.309, "path": "M 382.3 400.2 L 411.0 510.3 L 420.0 525.6 L 423.2 528.1 L 427.7 530.0 L 437.3 529.0 L 448.0 520.2 L 455.9 511.6 L 463.0 507.8 L 467.1 507.6 L 473.1 509.5 L 485.7 517.2 L 495.7 521.3 L 509.9 524.0 L 516.1 524.4 L 532.2 521.8 L 548.9 514.1 L 563.3 501.2 L 572.1 487.2 L 575.3 479.7 L 587.6 439.2 L 645.7 215.5 L 646.1 205.1 L 642.1 197.7 L 631.3 191.9 L 588.4 184.2 L 568.0 187.7 L 556.0 194.7 L 544.5 205.7 L 453.4 328.1 L 442.8 333.0 L 435.9 333.8 L 418.8 332.5 L 408.5 328.6 L 396.1 320.4 L 390.7 311.6 L 384.0 284.5 L 381.3 266.9 L 380.8 252.3 L 382.6 246.7 L 387.4 242.8 L 393.3 241.6 L 400.6 243.9 L 417.8 255.3 L 427.7 255.8 L 432.4 254.0 L 438.0 249.5 L 441.1 244.9 L 443.0 235.6 L 442.3 230.6 L 436.1 220.4 L 418.4 203.1 L 406.4 187.8 L 402.8 178.1 L 398.8 158.8 L 398.6 146.9 L 400.7 143.3 L 402.5 141.1 L 407.6 139.5 L 414.2 141.5 L 445.6 176.5 L 453.6 182.4 L 462.7 185.8 L 472.5 187.1 L 486.5 186.0 L 500.0 179.9 L 507.0 174.3 L 510.9 169.1 L 552.7 102.7 L 553.8 97.0 L 551.3 90.6 L 540.9 83.9 L 508.6 72.0 L 498.9 70.0 L 457.6 77.2 L 430.1 88.3 L 413.9 96.9 L 396.4 111.3 L 387.8 122.9 L 384.1 130.8 L 376.5 156.6 L 368.0 199.0 L 355.2 248.8 L 353.9 268.4 L 356.1 291.8 L 375.7 373.4 Z"}, {"id": "vegas", "name": "Las Vegas Strip Circuit", "country": "USA", "lengthKm": 6.201, "path": "M 615.6 478.4 L 631.4 460.8 L 633.4 457.5 L 634.1 453.5 L 632.4 450.0 L 629.6 447.7 L 624.7 445.8 L 620.0 445.1 L 615.5 445.3 L 611.3 446.6 L 602.0 452.1 L 593.4 460.6 L 590.1 462.7 L 582.9 464.3 L 579.0 464.3 L 572.0 461.9 L 564.5 456.7 L 558.5 448.7 L 556.1 441.8 L 554.4 239.9 L 555.7 236.8 L 558.1 235.3 L 612.7 236.0 L 619.2 234.5 L 629.3 225.0 L 632.6 220.4 L 637.0 210.9 L 638.9 198.3 L 638.7 194.3 L 636.4 192.9 L 630.3 192.2 L 628.2 190.9 L 626.4 188.1 L 625.6 183.7 L 626.0 180.5 L 635.3 163.1 L 634.5 158.2 L 629.7 155.0 L 620.8 154.0 L 554.3 152.4 L 529.7 148.8 L 521.6 144.9 L 512.6 135.8 L 505.0 120.5 L 493.2 93.0 L 485.6 85.1 L 477.8 79.7 L 457.3 72.8 L 443.2 70.0 L 439.4 71.9 L 436.5 80.0 L 421.8 108.5 L 394.6 156.8 L 385.9 176.4 L 372.9 220.4 L 370.4 232.5 L 366.2 262.8 L 365.1 285.8 L 365.6 353.7 L 362.7 430.4 L 361.1 513.0 L 362.4 515.0 L 364.3 515.6 L 368.6 515.5 L 371.9 516.7 L 379.1 524.0 L 385.5 527.6 L 394.0 529.2 L 430.8 530.0 L 537.9 529.4 L 570.4 524.1 L 578.2 519.9 L 580.9 517.3 Z"}, {"id": "qatar", "name": "Lusail International Circuit", "country": "Qatar", "lengthKm": 5.419, "path": "M 372.7 348.4 L 305.1 225.9 L 303.8 219.5 L 304.6 212.8 L 307.0 207.7 L 310.9 203.9 L 316.7 200.5 L 323.4 199.4 L 329.7 200.6 L 378.2 229.8 L 382.8 231.1 L 388.9 231.3 L 396.0 229.2 L 401.6 224.0 L 404.9 218.2 L 405.7 212.4 L 404.6 170.5 L 405.3 164.7 L 409.3 155.1 L 481.8 75.2 L 485.6 72.1 L 491.5 70.5 L 497.1 70.0 L 502.9 71.5 L 507.4 74.1 L 527.9 93.6 L 530.2 97.7 L 531.0 108.3 L 529.7 113.1 L 526.7 117.4 L 481.8 166.4 L 479.8 170.0 L 479.7 173.8 L 480.7 177.3 L 482.9 179.8 L 486.2 181.8 L 490.6 182.4 L 493.8 181.5 L 576.3 148.5 L 581.4 148.0 L 587.7 148.9 L 593.0 151.3 L 597.2 155.4 L 599.8 160.7 L 600.8 165.9 L 600.7 170.5 L 599.2 174.8 L 595.9 179.9 L 587.2 187.3 L 574.7 202.9 L 570.0 211.2 L 566.2 220.9 L 559.7 244.2 L 556.4 248.5 L 548.0 253.3 L 503.4 264.0 L 496.5 269.0 L 494.0 277.6 L 494.8 283.9 L 508.0 298.6 L 520.8 308.3 L 534.2 315.8 L 547.8 320.6 L 561.4 323.5 L 574.7 324.7 L 655.8 315.9 L 661.9 317.2 L 669.0 320.5 L 674.4 324.7 L 679.5 331.5 L 694.9 360.1 L 696.2 365.0 L 695.5 374.1 L 668.3 418.5 L 665.3 421.4 L 656.2 424.8 L 649.9 424.6 L 573.3 409.2 L 567.9 409.2 L 562.5 410.8 L 557.9 414.0 L 554.6 417.9 L 501.3 521.0 L 497.0 525.9 L 492.2 528.9 L 485.1 530.0 L 479.8 529.4 L 474.6 527.2 L 469.3 522.7 Z"}, {"id": "abudhabi", "name": "Yas Marina Circuit", "country": "UAE", "lengthKm": 5.281, "path": "M 497.4 327.7 L 561.8 319.1 L 565.2 317.9 L 567.8 315.3 L 569.5 311.6 L 569.9 308.0 L 558.6 260.7 L 556.8 255.9 L 554.4 252.4 L 547.0 247.4 L 528.7 241.7 L 518.1 235.6 L 508.7 225.2 L 505.9 218.6 L 504.8 208.1 L 512.5 177.5 L 514.2 164.7 L 514.3 155.6 L 504.5 78.5 L 503.8 76.1 L 501.9 73.6 L 498.6 70.9 L 494.3 70.0 L 489.8 71.3 L 485.7 77.4 L 481.7 89.2 L 477.9 106.3 L 420.9 275.3 L 403.9 331.6 L 391.7 367.8 L 391.7 371.6 L 392.9 373.0 L 395.7 373.0 L 408.2 371.8 L 410.0 374.0 L 417.0 400.1 L 420.7 409.2 L 424.1 415.7 L 431.3 426.2 L 439.5 435.7 L 449.8 444.5 L 511.5 492.5 L 531.1 504.4 L 587.2 530.0 L 597.0 529.0 L 601.6 526.4 L 605.7 521.7 L 608.2 515.0 L 608.3 506.8 L 605.8 499.5 L 603.7 496.3 L 596.9 490.8 L 592.9 489.1 L 587.0 488.2 L 532.7 483.3 L 530.1 482.4 L 502.8 465.1 L 499.3 458.4 L 493.6 431.6 L 494.0 429.5 L 495.3 428.0 L 497.3 427.5 L 517.9 424.4 L 521.9 422.6 L 523.5 420.9 L 525.1 417.9 L 525.5 414.1 L 525.6 395.6 L 524.1 392.4 L 522.2 390.5 L 519.4 389.4 L 507.8 388.0 L 460.4 394.9 L 452.0 395.0 L 444.2 393.1 L 439.9 388.9 L 420.8 355.0 L 419.6 347.9 L 420.2 341.3 L 423.7 338.4 L 428.2 337.6 Z"}];

let phase = 'FOCUS'; // FOCUS | SHORT | LONG
let lap = 1;
let running = false;
let durationMs = defaults.focusMin * 60e3;
let remainingMs = durationMs;
let endAt = 0;          // timestamp performance.now() di fine fase
let rafId = 0;
let bgTimer = 0;
let midRadioFired = false;
let trackLen = 0;
/* Cache anti-jank: a 60fps si tocca solo l'SVG; i testi si aggiornano
   solo quando la stringa cambia (e max ~5Hz per la percentuale) */
let lastTimeStr = '';
let lastPctStr = '';
let lastSrPct = -1;
let lastTextAt = 0;
/* Wizard selection state (declared before boot() runs) */
const wiz = { step: 1, team: null, driver: null, compound: 'medium' };
/* Pit radio audio element (declared before boot() runs) */
let radioAudio = null;
/* True while a P1 celebration clip owns the audio channel */
let victoryHold = false;
/* Start lights gantry state (declared before boot() runs) */
let lightsTimers = [];
let lightsActive = false;
/* Official 2026 car photos (formula1.com, embedded in assets/cars). © Formula One — see credits.html. */
const TEAM_CARS = {
  'Scuderia Ferrari': 'assets/cars/ferrari.webp',
  'Red Bull Racing': 'assets/cars/redbullracing.webp',
  'McLaren F1 Team': 'assets/cars/mclaren.webp',
  'Mercedes-AMG Petronas': 'assets/cars/mercedes.webp',
  'Aston Martin F1': 'assets/cars/astonmartin.webp',
  'Alpine F1 Team': 'assets/cars/alpine.webp',
  'Williams Racing': 'assets/cars/williams.webp',
  'VCARB': 'assets/cars/racingbulls.webp',
  'Audi F1 Team': 'assets/cars/audi.webp',
  'Haas F1 Team': 'assets/cars/haasf1team.webp',
  'Cadillac F1 Team': 'assets/cars/cadillac.webp',
};
/* Last start jingle played (rotation never repeats it twice in a row) */
let lastStartSrc = null;
/* Subtitle engine state (declared before boot() runs) */
let subWords = [];
let subSpans = [];
let subIdx = 0;
let subRaf = 0;
const transcriptCache = {};
const STEP_TITLES = {
  1: ['Step 1 of 3 · Team', 'Select your team'],
  2: ['Step 2 of 3 · Driver', 'Select your driver'],
  3: ['Step 3 of 3 · Tyre & strategy', 'Tyre compound — select your focus intensity'],
};

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const ui = {};
['timer-display','phase-badge','lap-counter','team-radio-text','watermark-number',
 'driver-badge-color','chip-team','chip-name','btn-start','btn-pause','btn-reset','btn-skip',
 'toggle-audio-btn','audio-icon-on','audio-icon-off','toggle-settings-btn','settings-panel',
  'close-settings-btn','cfg-focus','cfg-short','cfg-long','cfg-laps','cfg-autostart','cfg-notifications','cfg-radio',
  'circuit-selector','track-base','track-glow','track-progress','car-marker','car-dot-outer','finish-anchor',
 'tick-s1','tick-s2','sec-1','sec-2','sec-3','stat-track-name','stat-track-meta','stat-completion',
  'stat-delta','sr-progress','pit-stop-overlay','finish-overlay','btn-close-finish','live-region',
  'setup-modal','open-driver-modal','setup-close','setup-back','setup-next','setup-title',
  'setup-step-label','setup-hint','teams-grid','driver-team-hint','driver-carousel',
  'car-prev','car-next','compound-grid','custom-fields','sw-cfocus','sw-cshort','sw-clong',
  'sw-laps','sw-short','sw-long','session-target-desc',
  'lights-overlay','lights-row','lights-heading','lights-counter','lights-banner',
  'btn-lights-skip','btn-lights-abort','trigger-lights-btn',
  'radio-card','radio-code','radio-driver','radio-dot','radio-team',
  'radio-replay','radio-subs'
].forEach((id) => { ui[camel(id)] = $(id); });
function camel(id) { return id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()); }

/* ---------- Boot: disegna SUBITO i dati incorporati, aggiorna in background ---------- */
boot();
function boot() {
  bindEvents(); // bottoni/tastiera/select funzionano da subito
  const fresh = !localStorage.getItem(STORE_KEY); // prima di qualsiasi save()
  drivers = FALLBACK_DRIVERS.slice();
  circuits = FALLBACK_CIRCUITS.slice();
  initUI(fresh); // mappa + pilota visibili al primo paint, senza aspettare la rete
  void upgradeDatasets(); // dataset completi quando (e se) arrivano
}
function initUI(maybeShowModal) {
  buildCircuitSelector();
  if (!settings.driverId || !drivers.some((d) => d.id === settings.driverId)) {
    settings.driverId = drivers[0].id;
  }
  wiz.team = driver().team;
  wiz.driver = settings.driverId;
  wiz.compound = settings.compound || 'medium';
  renderTeams();
  renderCarousel();
  selectCompound(wiz.compound, { prefill: false });
  applyDriver(settings.driverId, { silent: true });
  loadCircuit(settings.circuitId);
  syncSettingsForm();
  syncAudioIcon();
  setPhase('FOCUS', { resetLap: false });
  gotoStep(1);
  // First visit (no saved key at boot) → show the setup wizard
  if (maybeShowModal && typeof ui.setupModal.showModal === 'function') {
    try { ui.setupModal.showModal(); } catch {}
  }
}
/* Sostituisce i dati incorporati con quelli completi senza disturbare la sessione */
async function upgradeDatasets() {
  try {
    const [d, c] = await Promise.all([
      fetch('./data/drivers.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch('./data/circuits.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    ]);
    if (!Array.isArray(d) || !d.length || !Array.isArray(c) || !c.length) return;
    const keepDriver = settings.driverId, keepCircuit = settings.circuitId;
    drivers = d; circuits = c;
    if (!drivers.some((x) => x.id === keepDriver)) settings.driverId = drivers[0].id;
    buildCircuitSelector();
    if (!drivers.some((x) => x.id === wiz.driver)) { wiz.team = driver().team; wiz.driver = settings.driverId; }
    renderTeams();
    renderCarousel();
    applyDriver(settings.driverId, { silent: true });
    loadCircuit(circuits.some((x) => x.id === keepCircuit) ? keepCircuit : settings.circuitId);
  } catch (e) {
    console.warn('Dataset completi non disponibili, resto sui dati incorporati.', e);
  }
}

/* ---------- Storage ---------- */
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch { return { ...defaults }; }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch {}
}

/* ---------- Audio (WebAudio, nessun file) ---------- */
let actx = null;
function beep(freq = 880, dur = 0.15, type = 'sine') {
  if (!settings.audio) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') void actx.resume();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.16, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
  } catch (e) { console.warn('Audio non disponibile', e); }
}
const fanfare = () => [440, 554, 659, 880].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'triangle'), i * 150));

/* ═══════════ TIMER (timestamp-based) ═══════════ */
function phaseMinutes() {
  return phase === 'FOCUS' ? settings.focusMin : phase === 'SHORT' ? settings.shortMin : settings.longMin;
}
function setPhase(next, { resetLap = false } = {}) {
  phase = next;
  if (resetLap) lap = 1;
  durationMs = Math.max(1, phaseMinutes()) * 60e3;
  remainingMs = durationMs;
  midRadioFired = false;
  paintPhase();
  paintTime(remainingMs);
  paintProgress(0);
  // Real team radio when entering the pits; silence when back on track.
  // After a P1 victory the celebration clip keeps playing (no box clip over it).
  if (phase === 'FOCUS') stopPitRadio();
  else if (victoryHold) victoryHold = false;
  else playPitRadio();
}
function paintPhase() {
  const pit = phase !== 'FOCUS';
  ui.phaseBadge.textContent = phase === 'FOCUS' ? 'Focus' : phase === 'SHORT' ? 'Pit stop · short' : 'Pit stop · long';
  ui.phaseBadge.classList.toggle('phase-pit', pit);
  ui.lapCounter.textContent = `Lap ${lap}/${settings.lapsBeforeLong}`;
  ui.pitStopOverlay.hidden = !pit;
  ui.statDelta.textContent = pit ? 'Pit lane' : 'Green track';
  ui.statDelta.className = pit ? 'status-pit' : 'status-ok';
  ui.sessionTargetDesc.textContent = pit ? 'Target: recover, hydrate, breathe' : 'Target: maximum concentration on track';
  // in pit il tracciato resta spento: solo base bianca (impostato una volta sola, non per frame)
  ui.trackProgress.style.opacity = pit ? '0.15' : '1';
  ui.trackGlow.style.opacity = pit ? '0' : '0.22';
  ui.carDotOuter.style.display = pit ? 'none' : '';
  say(`Phase ${ui.phaseBadge.textContent}, lap ${lap} of ${settings.lapsBeforeLong}.`);
}

function start() {
  if (running) return;
  // Fresh focus stint → F1 lights ceremony first (auto-closes, then begins)
  if (phase === 'FOCUS' && remainingMs === durationMs && !lightsActive) {
    openLights();
    return;
  }
  beginStart();
}
function beginStart() {
  if (running) return;
  if (settings.notify && 'Notification' in window && Notification.permission !== 'granted') {
    void Notification.requestPermission();
  }
  running = true;
  endAt = performance.now() + remainingMs;
  beep(587, 0.1);
  // Fresh focus stint → driver start jingle (not on resume after pause)
  if (phase === 'FOCUS' && durationMs - remainingMs < 2000) playMoment('start');
  ui.btnStart.setAttribute('disabled', '');
  ui.statDelta.textContent = 'Optimal lap time';
  ui.statDelta.className = 'status-ok';
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
  clearInterval(bgTimer);
  bgTimer = setInterval(() => { if (running) paintTitle(Math.max(0, endAt - performance.now())); }, 1000);
}
function pause() {
  if (!running) return;
  running = false;
  remainingMs = Math.max(0, endAt - performance.now());
  cancelAnimationFrame(rafId);
  clearInterval(bgTimer);
  beep(440, 0.14);
  ui.btnStart.removeAttribute('disabled');
  ui.statDelta.textContent = 'Safety car · paused';
  ui.statDelta.className = 'status-warn';
  paintTitle(remainingMs);
}
function reset() {
  const wasRunning = running;
  if (wasRunning) pause();
  remainingMs = durationMs;
  stopPitRadio();
  victoryHold = false;
  paintTime(remainingMs);
  paintProgress(0);
  paintTitle(remainingMs);
  ui.statDelta.textContent = phase === 'FOCUS' ? 'Green track' : 'Pit lane';
}
function skip() {
  const wasRunning = running;
  if (wasRunning) pause();
  advance(); // passa alla fase successiva senza fanfara
  if (wasRunning && settings.autoStart) setTimeout(start, 600);
}
/* rAF loop: l'unica fonte di verità è il timestamp → nessun drift, anche da tab in background.
   Per frame si scrive SOLO l'SVG (dashoffset + posizione). Testi e titolo solo al cambio secondo. */
function tick() {
  if (!running) return;
  const left = Math.max(0, endAt - performance.now());
  const tstr = fmt(left);
  if (tstr !== lastTimeStr) {
    lastTimeStr = tstr;
    ui.timerDisplay.textContent = tstr;
    paintTitle(left);
  }
  const v = Math.min(1, (durationMs - left) / durationMs);
  paintTrack(v);
  paintTexts(v, false);
  if (!midRadioFired && left / durationMs < 0.5) { midRadioFired = true; radio('mid'); }
  if (left <= 0) { complete(); return; }
  rafId = requestAnimationFrame(tick);
}
function complete() {
  running = false;
  cancelAnimationFrame(rafId);
  clearInterval(bgTimer);
  ui.btnStart.removeAttribute('disabled');
  const isVictory = phase === 'FOCUS' && lap >= settings.lapsBeforeLong;
  // P1 celebration clip for a completed cycle, synth fanfare otherwise
  if (isVictory && playMoment('finish')) victoryHold = true;
  else fanfare();
  radio('end');
  notify(`${phaseLabel()} complete`, `Lap ${lap}/${settings.lapsBeforeLong} — ${phase === 'FOCUS' ? 'pit stop!' : 'back on track.'}`);
  paintProgress(1);
  advance();
  if (settings.autoStart) setTimeout(start, REDUCED ? 300 : 1200);
}
function advance() {
  if (phase === 'FOCUS') {
    const lastLap = lap >= settings.lapsBeforeLong;
    if (lastLap) ui.finishOverlay.hidden = false; // bandiera a scacchi a fine ciclo
    setPhase(lastLap ? 'LONG' : 'SHORT');
  } else {
    if (phase === 'LONG') lap = 1; else lap = Math.min(lap + 1, settings.lapsBeforeLong);
    setPhase('FOCUS');
  }
  radio('start');
  paintTitle(remainingMs);
}
function phaseLabel() { return phase === 'FOCUS' ? 'Focus' : 'Pit stop'; }

/* ---------- Rendering tempo ---------- */
function fmt(ms) {
  const s = Math.ceil(ms / 1e3), m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function paintTime(ms) {
  lastTimeStr = fmt(ms);
  ui.timerDisplay.textContent = lastTimeStr;
  paintTitle(ms);
}
function paintTitle(ms) { document.title = `${fmt(ms)} · ${phaseLabel()} | PomoGP`; }

/* ═══════════ CIRCUITO SVG ═══════════ */
function buildCircuitSelector() {
  ui.circuitSelector.innerHTML = circuits
    .map((c) => `<option value="${c.id}">${c.name} · ${c.country}</option>`).join('');
  ui.circuitSelector.value = settings.circuitId;
}
function loadCircuit(id) {
  const c = circuits.find((x) => x.id === id) || circuits.find((x) => x.id === 'monza') || circuits[0];
  settings.circuitId = c.id; save();
  ui.circuitSelector.value = c.id;
  ui.trackBase.setAttribute('d', c.path);
  ui.trackGlow.setAttribute('d', c.path);
  ui.trackProgress.setAttribute('d', c.path);
  trackLen = ui.trackProgress.getTotalLength();
  ui.trackProgress.style.strokeDasharray = `${trackLen} ${trackLen}`;
  ui.trackProgress.style.strokeDashoffset = `${trackLen}`;
  ui.trackGlow.style.strokeDasharray = `${trackLen} ${trackLen}`;
  ui.trackGlow.style.strokeDashoffset = `${trackLen}`;
  // start/finish sul punto 0 (senso di marcia = direzione path)
  const p0 = ui.trackProgress.getPointAtLength(0);
  ui.finishAnchor.setAttribute('cx', p0.x); ui.finishAnchor.setAttribute('cy', p0.y);
  // tacche settori a 1/3 e 2/3
  placeTick(ui.tickS1, 1 / 3); placeTick(ui.tickS2, 2 / 3);
  ui.statTrackName.textContent = c.name ?? c.id;
  ui.statTrackMeta.textContent = `${c.country ?? '—'} · ${Number(c.lengthKm ?? 0).toFixed(3)} km`;
  paintProgress(0);
}
function placeTick(line, frac) {
  try {
    const p = ui.trackProgress.getPointAtLength(trackLen * frac);
    const q = ui.trackProgress.getPointAtLength(Math.min(trackLen - 1, trackLen * frac + 2));
    const dx = q.x - p.x, dy = q.y - p.y, n = Math.hypot(dx, dy) || 1;
    const nx = (-dy / n) * 16, ny = (dx / n) * 16; // perpendicolare = tacca
    line.setAttribute('x1', p.x - nx); line.setAttribute('y1', p.y - ny);
    line.setAttribute('x2', p.x + nx); line.setAttribute('y2', p.y + ny);
  } catch {}
}
/* progress 0→1: rosso da start/finish + car dot sulla testa + S1/S2/S3.
   paintTrack = solo SVG, sicura a 60fps. paintTexts = testi strozzati (max ~5Hz),
   screen reader solo al cambio di punto percentuale. */
function paintTrack(v) {
  if (!trackLen) return;
  const off = `${trackLen * (1 - v)}`;
  ui.trackProgress.style.strokeDashoffset = off;
  ui.trackGlow.style.strokeDashoffset = off;
  try {
    const pt = ui.trackProgress.getPointAtLength(trackLen * v);
    ui.carMarker.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
  } catch {}
}
function paintTexts(v, force) {
  const pctStr = (v * 100).toFixed(1);
  const now = performance.now();
  if (!force && (pctStr === lastPctStr || now - lastTextAt < 200)) return;
  lastPctStr = pctStr;
  lastTextAt = now;
  ui.statCompletion.textContent = `${pctStr}%`;
  ui.sec1.classList.toggle('lit', v >= 0.01);
  ui.sec2.classList.toggle('lit', v >= 1 / 3);
  ui.sec3.classList.toggle('lit', v >= 2 / 3);
  const whole = Math.floor(v * 100);
  if (force || whole !== lastSrPct) {
    lastSrPct = whole;
    ui.srProgress.textContent = `Completion ${whole} percent`;
  }
}
function paintProgress(p) {
  const v = Math.min(1, Math.max(0, p));
  paintTrack(v);
  paintTexts(v, true);
}

/* ═══════════ SETUP WIZARD (Team → Driver → Tyre & Strategy) ═══════════ */

function teamList() {
  const map = new Map();
  drivers.forEach((d) => {
    if (!map.has(d.team)) map.set(d.team, { name: d.team, color: d.color, count: 0 });
    map.get(d.team).count++;
  });
  return [...map.values()];
}
function renderTeams() {
  ui.teamsGrid.innerHTML = '';
  teamList().forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'team-card';
    b.dataset.team = t.name;
    b.setAttribute('aria-pressed', String(wiz.team === t.name));
    const sw = document.createElement('span');
    sw.className = 'team-swatch';
    sw.style.background = t.color;
    const tx = document.createElement('span');
    const nm = document.createElement('span');
    nm.className = 'team-name';
    nm.textContent = t.name;
    const ct = document.createElement('span');
    ct.className = 'team-count';
    ct.textContent = `${t.count} drivers`;
    tx.append(nm, ct);
    b.append(sw, tx);
    if (TEAM_CARS[t.name]) {
      const img = document.createElement('img');
      img.className = 'team-car';
      img.src = TEAM_CARS[t.name];
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error', () => img.remove());
      b.append(img);
    }
    b.addEventListener('click', () => {
      wiz.team = t.name;
      wiz.driver = null;
      syncTeams();
      renderCarousel();
      gotoStep(2);
    });
    ui.teamsGrid.appendChild(b);
  });
}
function syncTeams() {
  ui.teamsGrid.querySelectorAll('.team-card').forEach((el) =>
    el.setAttribute('aria-pressed', String(el.dataset.team === wiz.team)));
}
function renderCarousel() {
  ui.driverCarousel.innerHTML = '';
  ui.driverTeamHint.textContent = wiz.team || 'Select a team first';
  drivers.filter((d) => d.team === wiz.team).forEach((d) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'driver-slide';
    b.dataset.id = d.id;
    b.setAttribute('aria-pressed', String(wiz.driver === d.id));
    const num = document.createElement('span');
    num.className = 'driver-slide-num';
    num.textContent = d.number;
    const nm = document.createElement('span');
    nm.className = 'driver-slide-name';
    nm.textContent = d.name;
    const tm = document.createElement('span');
    tm.className = 'driver-slide-team';
    tm.textContent = d.team;
    const dot = document.createElement('span');
    dot.className = 'driver-slide-dot';
    dot.style.background = d.color;
    b.append(num, nm, tm, dot);
    if (d.photo) {
      const img = document.createElement('img');
      img.className = 'driver-slide-photo';
      img.src = d.photo;
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('error', () => img.remove());
      b.prepend(img);
    }
    b.addEventListener('click', () => { wiz.driver = d.id; syncCarousel(); refreshWizardFoot(); });
    ui.driverCarousel.appendChild(b);
  });
}
function syncCarousel() {
  ui.driverCarousel.querySelectorAll('.driver-slide').forEach((el) =>
    el.setAttribute('aria-pressed', String(el.dataset.id === wiz.driver)));
}
function selectCompound(id, { prefill = true } = {}) {
  wiz.compound = id;
  ui.compoundGrid.querySelectorAll('.compound-card').forEach((el) =>
    el.setAttribute('aria-checked', String(el.dataset.compound === id)));
  ui.customFields.hidden = id !== 'custom';
  if (prefill && id !== 'custom') {
    ui.swShort.value = COMPOUNDS[id].shortMin;
    ui.swLong.value = COMPOUNDS[id].longMin;
  }
  refreshWizardFoot();
}
function compoundFocus() {
  if (wiz.compound === 'custom') {
    return Math.min(Math.max(parseInt(ui.swCfocus.value, 10) || 25, 1), 180);
  }
  return COMPOUNDS[wiz.compound].focusMin;
}
function gotoStep(n) {
  wiz.step = n;
  document.querySelectorAll('#setup-modal [data-panel]').forEach((p) => {
    p.hidden = p.dataset.panel !== String(n);
  });
  document.querySelectorAll('.setup-steps li').forEach((li) => {
    const k = Number(li.dataset.dot);
    li.classList.toggle('current', k === n);
    li.classList.toggle('done', k < n);
  });
  const [label, title] = STEP_TITLES[n];
  ui.setupStepLabel.textContent = label;
  ui.setupTitle.textContent = title;
  ui.setupBack.disabled = n === 1;
  ui.setupNext.textContent = n === 3 ? 'Start engine' : 'Continue →';
  refreshWizardFoot();
}
function refreshWizardFoot() {
  const ok = wiz.step === 1 ? !!wiz.team : wiz.step === 2 ? !!wiz.driver : !!wiz.compound;
  ui.setupNext.disabled = !ok;
  if (wiz.step === 1) ui.setupHint.textContent = wiz.team || 'Pick a team to continue';
  else if (wiz.step === 2) ui.setupHint.textContent = wiz.driver ? driverLabel(wiz.driver) : 'Pick your driver';
  else ui.setupHint.textContent = wiz.compound === 'custom' ? 'Custom timings — set them above' : `${cap(wiz.compound)} stint locked in`;
}
function driverLabel(id) {
  const d = drivers.find((x) => x.id === id);
  return d ? `${d.number} · ${d.name}` : '';
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function openSetup() {
  const d = driver();
  if (d) { wiz.team = d.team; wiz.driver = d.id; }
  wiz.compound = settings.compound || 'medium';
  renderTeams();
  renderCarousel();
  selectCompound(wiz.compound, { prefill: false });
  ui.swLaps.value = settings.lapsBeforeLong;
  ui.swShort.value = settings.shortMin;
  ui.swLong.value = settings.longMin;
  ui.swCfocus.value = settings.focusMin;
  ui.swCshort.value = settings.shortMin;
  ui.swClong.value = settings.longMin;
  gotoStep(1);
  if (typeof ui.setupModal.showModal === 'function' && !ui.setupModal.open) {
    try { ui.setupModal.showModal(); } catch {}
  }
}
function confirmSetup() {
  const laps = Math.min(Math.max(parseInt(ui.swLaps.value, 10) || 4, 1), 12);
  const short = Math.min(Math.max(parseInt(ui.swShort.value, 10) || 5, 1), 60);
  const long = Math.min(Math.max(parseInt(ui.swLong.value, 10) || 15, 1), 90);
  if (wiz.compound === 'custom') {
    settings.longMin = Math.min(Math.max(parseInt(ui.swClong.value, 10) || 15, 1), 90);
    settings.shortMin = Math.min(Math.max(parseInt(ui.swCshort.value, 10) || 5, 1), 60);
  } else {
    settings.shortMin = short;
    settings.longMin = long;
  }
  settings.focusMin = compoundFocus();
  settings.lapsBeforeLong = laps;
  settings.compound = wiz.compound;
  save();
  applyDriver(wiz.driver || settings.driverId);
  syncSettingsForm();
  lap = 1;
  setPhase('FOCUS', { resetLap: false });
  ui.setupModal.close();
  say(`Setup complete. ${driverLabel(settings.driverId)} on ${cap(wiz.compound)} tyres. Focus ${settings.focusMin} minutes.`);
}
function driver() { return drivers.find((d) => d.id === settings.driverId) || drivers[0]; }
function applyDriver(id, { silent = false } = {}) {
  if (!drivers.some((d) => d.id === id)) return;
  settings.driverId = id; save();
  const d = driver();
  ui.chipName.textContent = `${d.number} · ${d.name}`;
  ui.chipTeam.textContent = d.team;
  let chipImg = document.getElementById('chip-photo');
  if (d.photo) {
    if (!chipImg) {
      chipImg = document.createElement('img');
      chipImg.id = 'chip-photo';
      chipImg.className = 'chip-photo';
      chipImg.alt = '';
      chipImg.addEventListener('error', () => chipImg.remove());
      ui.driverBadgeColor.after(chipImg);
    }
    if (document.getElementById('chip-photo')) chipImg.src = d.photo;
  } else if (chipImg) chipImg.remove();
  ui.driverBadgeColor.style.background = d.color;
  ui.watermarkNumber.textContent = d.number;
  if (!silent) { radio('start'); say(`Driver selected: ${d.name}, ${d.team}.`); }
  else radio('start');
}
function radio(moment) {
  const d = driver(); if (!d) return;
  const key = moment === 'mid' ? 'radioMid' : moment === 'end' ? 'radioEnd' : 'radioStart';
  ui.teamRadioText.textContent = `"${d[key] || d.radioStart}"`;
}

/* ---------- Real pit team radio (downloaded originals, assets/radio/) ---------- */
function stopPitRadio() {
  try {
    if (radioAudio) { radioAudio.pause(); radioAudio.currentTime = 0; }
  } catch {}
  radioAudio = null;
  stopSubtitles();
  setRadioIdle();
}
function setRadioIdle() {
  ui.radioCard.classList.remove('playing');
  ui.radioCode.textContent = '—';
  ui.radioCode.style.color = '';
  ui.radioDriver.textContent = 'Standby';
  ui.radioDot.style.background = '';
  ui.radioTeam.textContent = 'Radio silent';
  ui.radioSubs.innerHTML = '<span class="w-idle">Standby for live comms…</span>';
}
function setRadioHeader(d) {
  ui.radioCode.textContent = d ? d.number : '—';
  ui.radioCode.style.color = d ? d.color : '';
  ui.radioDriver.textContent = d ? d.name : 'Standby';
  ui.radioDot.style.background = d ? d.color : '';
  ui.radioTeam.textContent = d ? `${d.team} · live` : 'Radio silent';
}
function playPitRadio() {
  stopPitRadio();
  if (settings.pitRadio === false) return; // dedicated toggle in settings
  const d = driver();
  playFile(d && d.pitRadio);
}
/* Start/finish moment clips. Returns true when a file actually starts. */
function playMoment(kind) {
  stopPitRadio();
  if (settings.pitRadio === false) return false;
  const d = driver();
  if (!d) return false;
  if (kind === 'start') return playFile(pickStartClip(d));
  return playFile(d.finishRadio);
}
/* Random start jingle, never the same twice in a row */
function pickStartClip(d) {
  const list = d && d.startRadio;
  const arr = Array.isArray(list) ? list.filter(Boolean) : (list ? [list] : []);
  if (!arr.length) return null;
  const pool = arr.length > 1 ? arr.filter((s) => s !== lastStartSrc) : arr;
  lastStartSrc = pool[Math.floor(Math.random() * pool.length)];
  return lastStartSrc;
}
function playFile(src) {
  if (!src) return false;
  setRadioHeader(driver());
  try {
    radioAudio = new Audio(src);
    radioAudio.volume = 0.9;
    radioAudio.addEventListener('play', () => ui.radioCard.classList.add('playing'));
    const hlOff = () => { ui.radioCard.classList.remove('playing'); stopSubLoop(); };
    radioAudio.addEventListener('pause', hlOff);
    radioAudio.addEventListener('ended', () => {
      ui.radioCard.classList.remove('playing');
      stopSubLoop();
      if (subSpans.length) paintSub(subSpans.length); // all done
    });
    const p = radioAudio.play();
    if (p && typeof p.catch === 'function') p.catch(() => { radioAudio = null; });
    loadSubsFor(src);
    startSubLoop();
    return true;
  } catch {
    radioAudio = null;
    return false;
  }
}
/* Subtitles: fetch matching transcript (assets/radio/X.mp3 <-> data/transcripts/X.json) */
async function loadSubsFor(src) {
  const base = String(src.split('/').pop() || '').replace(/\.mp3$/i, '');
  if (!base) return;
  try {
    let data = transcriptCache[base];
    if (!data) {
      const r = await fetch(`./data/transcripts/${base}.json`);
      if (!r.ok) throw new Error(r.status);
      data = await r.json();
      transcriptCache[base] = data;
    }
    // A newer audio may have started while fetching
    if (!radioAudio || !String(radioAudio.src).endsWith(`${base}.mp3`)) return;
    subWords = Array.isArray(data.words) ? data.words : [];
    subSpans = [];
    subIdx = 0;
    ui.radioSubs.innerHTML = '';
    subWords.forEach((w) => {
      const s = document.createElement('span');
      s.className = 'w w-next';
      s.textContent = w.w;
      ui.radioSubs.append(s);
      subSpans.push(s);
    });
    if (radioAudio) paintSub(indexForTime(radioAudio.currentTime || 0));
  } catch {
    /* file:// or missing transcript: header + audio still work */
  }
}
function indexForTime(t) {
  let idx = -1;
  for (let i = 0; i < subWords.length; i++) {
    if ((subWords[i].s || 0) <= t) idx = i;
    else break;
  }
  return idx;
}
function paintSub(idx) {
  subIdx = idx;
  subSpans.forEach((s, i) => {
    s.className = 'w ' + (i < idx ? 'w-done' : i === idx ? 'w-on' : 'w-next');
  });
}
function startSubLoop() {
  stopSubLoop();
  subRaf = requestAnimationFrame(subLoop);
}
function stopSubLoop() {
  if (subRaf) cancelAnimationFrame(subRaf);
  subRaf = 0;
}
function subLoop() {
  subRaf = 0;
  if (!radioAudio) return; // pause/ended/stop kill the loop via listeners
  if (subSpans.length) {
    const t = radioAudio.currentTime || 0;
    const first = subWords.length ? (subWords[0].s || 0) : 0;
    let idx;
    if (t < first) idx = -1;
    else {
      idx = subIdx < -1 ? -1 : subIdx;
      if (idx >= subWords.length) idx = subWords.length - 1;
      if (idx >= 0 && t < (subWords[idx].s || 0)) idx = indexForTime(t); // seek back
      while (idx + 1 < subWords.length && (subWords[idx + 1].s || 0) <= t) idx++;
    }
    if (idx !== subIdx) paintSub(idx);
  }
  subRaf = requestAnimationFrame(subLoop);
}
function stopSubtitles() {
  stopSubLoop();
  subWords = [];
  subSpans = [];
  subIdx = -1;
}

/* ---------- Notifiche / annunci ---------- */
function notify(title, body) {
  if (!settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(`PomoGP · ${title}`, { body }); } catch {}
}
function say(msg) { ui.liveRegion.textContent = msg; }

/* ---------- Settings form ---------- */
function syncSettingsForm() {
  ui.cfgFocus.value = settings.focusMin;
  ui.cfgShort.value = settings.shortMin;
  ui.cfgLong.value = settings.longMin;
  ui.cfgLaps.value = settings.lapsBeforeLong;
  ui.cfgAutostart.checked = settings.autoStart;
  ui.cfgNotifications.checked = settings.notify;
  ui.cfgRadio.checked = settings.pitRadio !== false;
}
function syncAudioIcon() {
  ui.audioIconOn.classList.toggle('hidden', !settings.audio);
  ui.audioIconOff.classList.toggle('hidden', settings.audio);
  ui.toggleAudioBtn.setAttribute('aria-pressed', String(settings.audio));
}

/* ═══════════ F1 START LIGHTS gantry (auto-closes on lights out) ═══════════ */
function buildLights() {
  ui.lightsRow.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const col = document.createElement('div');
    col.className = 'light-col';
    const lab = document.createElement('span');
    lab.textContent = i;
    const lamp = document.createElement('div');
    lamp.className = 'light-lamp';
    const bulb = document.createElement('div');
    bulb.className = 'light-bulb';
    bulb.id = `light-bulb-${i}`;
    lamp.append(bulb);
    col.append(lab, lamp);
    ui.lightsRow.append(col);
  }
}
function setBulb(i, on) {
  const el = document.getElementById(`light-bulb-${i}`);
  if (el) el.classList.toggle('on', on);
}
function resetLights() {
  for (let i = 1; i <= 5; i++) setBulb(i, false);
  ui.lightsCounter.textContent = 'Grid lights: 0 / 5 on';
  ui.lightsBanner.hidden = true;
  ui.lightsHeading.textContent = 'Get ready for the start';
  ui.lightsHeading.classList.remove('go');
}
function openLights() {
  if (lightsActive || running) return;
  lightsActive = true;
  resetLights();
  ui.lightsOverlay.hidden = false;
  say('Start lights sequence. Five red lights, then lights out.');
  for (let i = 1; i <= 5; i++) {
    lightsTimers.push(setTimeout(() => {
      if (!lightsActive) return;
      setBulb(i, true);
      beep(620, 0.18, 'sawtooth');
      ui.lightsCounter.textContent = `Grid lights: ${i} / 5 on`;
      if (i === 5) {
        lightsTimers.push(setTimeout(() => {
          if (lightsActive) lightsOut();
        }, 1200 + Math.random() * 1200)); // FIA-style random hold
      }
    }, i * 950));
  }
}
function lightsOut() {
  for (let i = 1; i <= 5; i++) setBulb(i, false);
  ui.lightsCounter.textContent = 'Lights out! Green track';
  ui.lightsBanner.hidden = false;
  ui.lightsHeading.textContent = 'Lights out and away we go!';
  ui.lightsHeading.classList.add('go');
  beep(1046, 0.35, 'square');
  lightsTimers.push(setTimeout(() => {
    closeLights();
    beginStart(); // auto-close → timer (and start jingle) begins
  }, 900));
}
function closeLights() {
  lightsActive = false;
  lightsTimers.forEach((t) => clearTimeout(t));
  lightsTimers = [];
  ui.lightsOverlay.hidden = true;
  resetLights();
}

/* ---------- Eventi ---------- */
function bindEvents() {
  buildLights();
  ui.btnStart.addEventListener('click', start);
  ui.btnPause.addEventListener('click', pause);
  ui.btnReset.addEventListener('click', reset);
  ui.btnSkip.addEventListener('click', skip);
  ui.btnCloseFinish.addEventListener('click', () => { ui.finishOverlay.hidden = true; });

  ui.circuitSelector.addEventListener('change', (e) => loadCircuit(e.target.value));

  ui.toggleSettingsBtn.addEventListener('click', () => {
    ui.settingsPanel.hidden = !ui.settingsPanel.hidden;
    ui.toggleSettingsBtn.setAttribute('aria-expanded', String(!ui.settingsPanel.hidden));
  });
  ui.closeSettingsBtn.addEventListener('click', () => {
    ui.settingsPanel.hidden = true;
    ui.toggleSettingsBtn.setAttribute('aria-expanded', 'false');
  });

  const num = (el, fb) => Math.min(Math.max(parseInt(el.value, 10) || fb, 1), 180);
  ui.cfgFocus.addEventListener('change', () => { settings.focusMin = num(ui.cfgFocus, 25); save(); if (!running && phase === 'FOCUS') setPhase('FOCUS'); });
  ui.cfgShort.addEventListener('change', () => { settings.shortMin = num(ui.cfgShort, 5); save(); if (!running && phase === 'SHORT') setPhase('SHORT'); });
  ui.cfgLong.addEventListener('change', () => { settings.longMin = num(ui.cfgLong, 15); save(); if (!running && phase === 'LONG') setPhase('LONG'); });
  ui.cfgLaps.addEventListener('change', () => {
    settings.lapsBeforeLong = Math.min(Math.max(parseInt(ui.cfgLaps.value, 10) || 4, 1), 12);
    lap = Math.min(lap, settings.lapsBeforeLong); save(); paintPhase();
  });
  ui.cfgAutostart.addEventListener('change', () => { settings.autoStart = ui.cfgAutostart.checked; save(); });
  ui.cfgRadio.addEventListener('change', () => {
    settings.pitRadio = ui.cfgRadio.checked; save();
    if (!settings.pitRadio) { stopPitRadio(); victoryHold = false; }
  });
  ui.cfgNotifications.addEventListener('change', () => {
    settings.notify = ui.cfgNotifications.checked; save();
    if (settings.notify && 'Notification' in window) void Notification.requestPermission();
  });

  ui.toggleAudioBtn.addEventListener('click', () => {
    settings.audio = !settings.audio; save(); syncAudioIcon();
    if (settings.audio) beep(700, 0.12);
  });

  ui.openDriverModal.addEventListener('click', () => openSetup());
  ui.setupClose.addEventListener('click', () => ui.setupModal.close());
  ui.setupModal.addEventListener('click', (e) => { if (e.target === ui.setupModal) ui.setupModal.close(); });
  ui.setupBack.addEventListener('click', () => gotoStep(Math.max(1, wiz.step - 1)));
  ui.setupNext.addEventListener('click', () => {
    if (wiz.step < 3) gotoStep(wiz.step + 1);
    else confirmSetup();
  });
  ui.carPrev.addEventListener('click', () =>
    ui.driverCarousel.scrollBy({ left: -220, top: 0, behavior: REDUCED ? 'auto' : 'smooth' }));
  ui.carNext.addEventListener('click', () =>
    ui.driverCarousel.scrollBy({ left: 220, top: 0, behavior: REDUCED ? 'auto' : 'smooth' }));
  ui.compoundGrid.querySelectorAll('.compound-card').forEach((el) =>
    el.addEventListener('click', () => selectCompound(el.dataset.compound)));

  ui.triggerLightsBtn.addEventListener('click', () => {
    if (!running && phase === 'FOCUS' && remainingMs === durationMs) openLights();
  });
  ui.radioReplay.addEventListener('click', () => {
    if (!radioAudio) return;
    try {
      radioAudio.currentTime = 0;
      paintSub(-1);
      const p = radioAudio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
      startSubLoop();
    } catch {}
  });
  ui.btnLightsSkip.addEventListener('click', () => { if (lightsActive) lightsOut(); });
  ui.btnLightsAbort.addEventListener('click', () => closeLights());

  // Keyboard: Space = start/pause · R = reset · S = skip (ignored while wizard is open)
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (lightsActive) {
      if (e.code === 'Space') { e.preventDefault(); lightsOut(); }
      else if (e.key === 'Escape') closeLights();
      return;
    }
    if (ui.setupModal.open) return;
    if (e.code === 'Space') { e.preventDefault(); running ? pause() : start(); }
    else if (e.key === 'r' || e.key === 'R') reset();
    else if (e.key === 's' || e.key === 'S') skip();
  });

  // Precise recalculation when returning to the tab (rAF stops in background: timestamps recover)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && running) paintTime(Math.max(0, endAt - performance.now()));
  });
}
