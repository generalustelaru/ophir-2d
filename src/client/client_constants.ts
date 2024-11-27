
import { ClientConstants } from './client_types';

const clientConstants: ClientConstants = {
    CONNECTION: {
        wsAddress: 'ws://localhost:8080',
    },
    COLOR: {
        barrierDefault: '#003C43',
        barrierNavigator: '#FFFDD7',
        activeShipBorder: '#FFFFFF',
        shipBorder: '#000000',
        playerPurple: '#A55A9A',
        playerYellow: '#FFC94A',
        playerRed: '#FF204E',
        playerGreen: '#87A922',
        illegal: '#A94438',
        validHex: '#A3FFD6',
        defaultHex: '#3887BE',
        activeHex: '#52D3D8',
        islandGreen: '#0A6847',
        holdDarkPurple: '#63365C',
        holdDarkYellow: '#996B00',
        holdDarkRed: '#990020',
        holdDarkGreen: '#667F1A',
        wood: '#8B4513',
        disabled: '#A9A9A9',
        sunset: '#FFA07A',
        boneWhite: '#EDEDED',
        stampEdge: '#850c03',
        marketOrange: '#ff601e',
        marketDarkOrange: '#8f2a00',
        treasuryGold: '#FFD700',
        treasuryDarkGold: '#8f7800',
        templeBlue: '#1e78c2',
        templeDarkBlue: '#134e7d',
        coinSilver: '#C0C0C0',
        upgradeBoxSilver: '#999999',
        darkerSilver: '#666666',
        vpGold: '#e5d280',
    },
    COLOR_PROFILES: {
        favorStampReady: { primary: '#aa0000', secondary: '#850c03', tertiary: null },
        favorStampActive: { primary: '#e70000', secondary: '#aa0000', tertiary: null },
        favorStampDisabled: { primary: '#999999', secondary: '#666666', tertiary: null },
    },
    HEX_OFFSET_DATA: [
        { id: 'center', x: 0, y: 0 },
        { id: 'topLeft', x: 86, y: 150 },
        { id: 'topRight', x: -86, y: 150 },
        { id: 'right', x: -172, y: 0 },
        { id: 'bottomRight', x: -86, y: -150 },
        { id: 'bottomLeft', x: 86, y: -150 },
        { id: 'left', x: 172, y: 0 },
    ],
    ISLAND_DATA: {
        center: { x: -60, y: -60, shape: 'M 9.8875768,3.0644533 C 10.865358,0.97716732 7.3147528,0.08614732 5.8894788,0.00813032 c -0.0753,-0.0041 -1.014455,-0.01604 -1.033991,0 -0.237481,0.194989 -0.444433,0.428758 -0.620394,0.679183 -0.07847,0.111684 0.03788,0.276899 0,0.40750898 -0.05217,0.17992 -0.37403,0.732787 -0.48253,0.815019 -0.338645,0.256663 -0.955789,0.388929 -1.378654,0.203755 -0.444188,-0.194511 -0.5688,-0.481063 -1.171856,-0.339591 -0.28007896,0.0657 -0.52541796,0.240662 -0.75825996,0.40751 -0.09292,0.06658 0,0.226394 0,0.339591 0,0.440413 -0.0052,0.865775 -0.137866,1.290448 -0.163292,0.522888 -0.387892,0.546796 -0.275731,1.15461 0.06779,0.367356 0.04308,0.791965 0.275731,1.086693 0.285642,0.36185 0.78884796,0.486844 1.17185696,0.7471 0.986681,0.670456 1.694445,1.26251 1.171856,2.512977 -0.09007,0.215531 -0.238866,0.402786 -0.344664,0.611265 -0.101206,0.1994327 -0.163453,0.4176707 -0.275731,0.6112647 -0.932085,1.197807 0.129447,1.668128 0.352302,2.782417 -0.02916,0.34477 -0.06317,0.824496 0.137864,1.154611 0.159638,0.262148 -0.457784,1.039632 -0.287271,1.168865 0.103021,0.07808 0.404313,1.805865 1.459128,-0.218008 0.06441,-0.12358 0.276543,0.04092 0.413596,0.06792 1.203822,0.237222 -0.64616,-1.827178 1.001477,-1.782083 3.307835,0.09053 -1.228329,-0.01369 2.079038,-0.01369 1.373534,0 1.06844,2.16395 2.409396,1.809474 0.4780462,-0.126369 1.9689162,-1.616819 2.4396312,-1.767551 1.160119,-0.37149 2.138191,2.335292 3.229922,1.756089 0.596904,-0.316682 0.348194,-0.308532 0.965057,-0.81502 0.215469,-0.176914 0.447058,-0.336184 0.689328,-0.475428 0.04838,-0.02781 0.191626,0.05168 0.206798,-0.06792 0.04284,-0.337718 0.05566,-0.678682 0.06893,-1.018775 0.02506,-0.641958 0.03627,-1.083145 -0.275731,-1.697957 -0.377228,-0.743353 -0.735984,-0.733228 -1.378654,-1.222529 -1.955938,-1.4891637 0.327681,0.01853 -1.24079,-0.8829387 -0.09924,-0.05704 -0.171141,-0.156914 -0.27573,-0.203754 -0.05535,-0.02479 -0.765785,-0.173503 -0.827193,-0.203755 -0.02055,-0.01014 0,-0.04528 0,-0.06792 0,-0.05233 0.04715,-0.644301 0.06893,-0.679183 0.08933,-0.143033 0.648593,-0.721629 0.758259,-1.018775 0.182748,-0.495162 0.0045,-1.054172 0.06893,-1.56212 0.05411,-0.426536 0.06247,-0.180438 0,-0.611265 -0.01301,-0.08965 0.03567,-0.188213 0,-0.271673 -1.26934,-2.970319 0.08714,0.441152 -1.03399,-1.630038 -0.131689,-0.243282 -0.03915,-0.827878 -0.413597,-0.950856 -0.473339,-0.155458 -0.710228,0.62041 -0.896126,0.815019 -0.15748,0.16486 -0.353409,0.292723 -0.551461,0.40751 -0.254831,0.147694 -0.915971,0.463335 -1.2407902,0.543346 -0.01601,0.0039 -0.546086,0.02119 -0.55146,0 -0.174651,-0.688319 0.179838,-0.02656 -0.137866,-0.339592 -0.05842,-0.05756 -0.139716,-0.574571 -0.06893,-0.679183 0.07244,-0.107067 0.304382,-0.06792 0.413597,-0.06792 h 0.275731 c 0.02298,0 0.06893,-0.02264 0.06893,0 0,0.09335 -0.04596,0.181116 -0.06893,0.271673 z', },
        topLeft: { x: -86, y: -100, shape: 'M 11.456664,0 0,6.6145833 v 4.2090447 c 0.07423,0.09328 0.08954,0.227591 0.156579,0.328145 0.150147,0.22522 0.359041,0.405134 0.528133,0.6165 0.04106,0.05132 0.467991,0.78979 0.52865,0.704867 0.137581,-0.192613 0.185059,-0.449125 0.352434,-0.6165 0.05608,-0.05608 0.886086,-0.443302 1.056783,-0.52865 0.05252,-0.02626 0.134696,0.04152 0.176216,0 0.04642,-0.04642 0.02913,-0.146857 0.08785,-0.176217 0.01764,-0.0088 0.880636,-0.08821 0.881083,-0.08785 0.43372,0.346975 0.838057,0.97356 0.968933,1.497066 0.176157,0.704625 -0.08808,0.08826 0,0.52865 0.03101,0.155034 0.14521,0.285248 0.176217,0.440283 0.05765,0.288265 -0.02058,0.443158 0.1757,0.704866 0.05907,0.07876 0.300564,0.124348 0.352433,0.176217 0.02076,0.02076 -0.02785,0.07855 0,0.08785 0.167117,0.05571 0.353854,-0.02185 0.52865,0 0.139219,0.0174 1.5797161,0.181927 1.6732831,0.08837 0.09813,-0.09813 0.166451,-0.518887 0.264583,-0.617017 0.07485,-0.07485 0.189215,-0.10085 0.264067,-0.1757 0.202416,-0.202417 -0.02277,-0.176216 0.176216,-0.176216 0.341904,0 0.885688,0.0565 1.14515,0.264066 0.181344,0.145075 0.228056,0.430711 0.351916,0.6165 0.1823549,0.273533 0.2529439,0.279913 0.3524339,0.52865 0.03448,0.0862 0.07016,0.173027 0.08837,0.264066 0.01151,0.05758 -0.03257,0.127357 0,0.176217 0.03642,0.05462 0.13631,0.03533 0.1757,0.08785 0.04072,0.0543 0.04954,0.310203 0.176217,0.352433 0.353495,0.117832 1.215678,0.02308 1.585433,-0.08785 0.276962,-0.08309 0.552123,-0.192037 0.792716,-0.352433 0.112537,-0.07502 0.133977,-0.334687 0.176217,-0.440283 0.04876,-0.121909 0.140146,-0.226187 0.176216,-0.352433 0.114616,-0.401154 -0.147372,-1.411569 -0.264066,-1.76165 -0.04152,-0.124562 -0.138487,-0.226671 -0.176217,-0.352433 -0.117377,-0.391245 -0.05662,-0.755934 -0.176216,-1.144633 -0.252043,-0.819142 -0.784697,-1.4740377 -1.056783,-2.2902997 -0.06176,-0.185285 0.02792,-0.296066 -0.08837,-0.52865 -0.07516,-0.150324 0.02536,-1.402546 0.08837,-1.497066 0.150145,-0.22522 0.377987,-0.39128 0.528133,-0.6165 0.0515,-0.07725 0.03687,-0.1868161 0.08837,-0.2640661 0.01628,-0.02443 0.05849,0 0.08785,0 0.02936,-0.05872 0.06761,-0.113937 0.08837,-0.176217 0.01857,-0.05571 -0.04152,-0.134697 0,-0.176217 0.02076,-0.02076 0.07023,0.02349 0.08785,0 0.270234,-0.360368 0.135016,-0.429403 0.264067,-0.8810825 0.02281,-0.07985 0.139076,-0.101946 0.176216,-0.176216 0.07047,-0.140932 0.0198,-0.674864 0.08837,-0.8805667 0.03347,-0.1004246 0.136907,-0.1657817 0.176217,-0.2640666 0.150649,-0.376624 -0.180753,-0.9598613 0,-1.3213664 0.201456,-0.4029124 0.165665,-0.672561 0.442867,-1.0355957 z', },
        topRight: { x: -34, y: -100, shape: 'M 4.614705,0 0,2.6644364 c 0.06284,0.2467217 0.135955,0.4564634 0.185002,0.5606902 0.117938,0.2506118 0.302864,0.4643836 0.440283,0.7048663 0.162856,0.2849984 0.258203,0.6074477 0.440283,0.8805667 0.104278,0.156418 0.262412,0.275763 0.352433,0.440799 0.08892,0.1630135 0.0873,0.3651205 0.176217,0.5281325 0.162689,0.298264 0.679147,0.864109 0.968933,1.057301 0.04886,0.03257 0.119995,-0.01857 0.1757,0 0.118168,0.03939 0.168895,0.184323 0.264583,0.264066 0.144421,0.120349 0.356212,0.184288 0.440283,0.352433 0.0013,0.0027 0.01341,1.2106558 0,1.2329998 -0.192256,0.320431 -0.493769,0.568506 -0.792716,0.792716 -0.260492,0.19537 0.185637,-0.573288 -0.264066,0.176217 -0.218659,0.3644351 0.07905,0.2156 -0.264583,0.6164991 -0.09553,0.111457 -0.266592,0.144614 -0.351918,0.264068 -0.07036,0.0985 -0.03423,0.244161 -0.08837,0.352433 -0.08407,0.168144 -0.292984,0.261938 -0.352433,0.440283 -0.05653,0.169582 0,0.435765 0,0.616499 0,0.906749 -0.01294,1.003427 0.528649,1.76165 0.07632,0.106843 0.08337,0.259591 0.176218,0.352433 0.02077,0.02076 0.06492,-0.01834 0.08785,0 0.129688,0.103751 0.19635,0.295676 0.352433,0.352434 0.193143,0.07023 0.410982,0 0.616499,0 h 1.14515 c 0.707553,0 1.91058,0.128756 2.554366,0 0.05758,-0.01151 0,-0.117498 0,-0.176216 v -2.378151 c 0,-0.231863 -0.05906,-0.537563 0.528133,-0.176216 0.265798,0.163567 0.395815,0.483666 0.616501,0.70435 1.2104585,1.008717 -0.07793,-0.149919 0.8810815,0.968933 0.324255,0.378296 0.745534,0.668235 1.056784,1.0573 0.11509,0.143863 0.03136,0.511211 0.1762165,0.70435 0.09788,0.130505 0.802364,0.863187 0.880566,0.880565 0.456756,0.101501 1.452171,0.253165 1.850017,-0.08785 0.1261,-0.108084 0.264411,-0.211597 0.352433,-0.352434 0.09819,-0.157107 0.493814,-1.501694 0.528134,-1.673283 0.02879,-0.143945 -0.0182,-0.29462 0,-0.440282 0.04385,-0.350839 0.2867,-0.640268 0.352432,-0.968933 0.01728,-0.08637 -0.03271,-0.182806 0,-0.264583 0.03084,-0.0771 0.117498,-0.116982 0.176216,-0.175701 0.232047,-0.232044 0.494428,-0.555722 0.792716,-0.704866 0.108273,-0.05414 0.239089,-0.04534 0.352433,-0.08785 0.184409,-0.06915 0.337065,-0.216816 0.528134,-0.264583 0.05696,-0.01424 0.12051,0.01857 0.176217,0 0.01222,-0.0041 0.02294,-0.01027 0.03307,-0.01757 V 6.6145831 Z', },
        right: { x: -40, y: -66, shape: 'm 13.091867,0 c -0.02842,0.03197 -0.05871,0.06151 -0.09612,0.08165 -0.278413,0.149915 -0.604149,0.198868 -0.880567,0.352433 -0.256649,0.142583 -0.449954,0.382987 -0.704866,0.52865 -0.124703,0.537111 -0.487807,0.06794 -0.704349,0.176216 -0.05252,0.02626 0.04152,0.134698 0,0.176218 -0.0534,0.0534 -0.586691,0.347656 -0.616501,0.351916 -0.3197075,0.04567 -0.6459795,0 -0.9689325,0 -0.264233,0 -0.531555,0.04018 -0.792717,0 -0.129772,-0.01997 -0.227869,-0.134696 -0.352433,-0.176216 -0.266386,-0.0888 -1.792404,0.0106 -2.025716,0.08837 -0.170773,0.05692 -0.298509,0.169551 -0.440283,0.264067 -0.05462,0.03642 -0.151837,0.02741 -0.176216,0.08837 -0.02622,0.06556 0,0.5996 0,0.70435 0,1.107426 0.127121,2.102304 -0.6165,2.99465 -0.09398,0.112772 -0.144322,0.268253 -0.264583,0.352433 -0.721404,0.504984 -1.828327,0.352433 -2.642216,0.352433 -0.172767,0 -0.640202,-0.07626 -0.792716,0 -0.49693803,0.248469 -0.71881803,0.380339 -0.96893303,0.880567 -0.211881,0.423764 0.325921,1.176752 0.616499,1.409216 0.153792,0.123033 0.34180703,0.202303 0.52865103,0.264583 0.139262,0.04642 0.358852,-0.122142 0.440283,0 0.102996,0.154501 0.09317,0.362052 0.176216,0.528133 0.277968,0.555936 0.577443,1.272287 0.968933,1.76165 0.432159,0.540199 0.908943,0.52865 1.497066,0.52865 0.358891,0 0.82528,0.05226 1.14515,-0.176217 0.135146,-0.09653 0.218115,-0.254753 0.352433,-0.352433 0.191429,-0.139222 0.429656,-0.207112 0.616499,-0.352433 0.08356,-0.06499 0.09153,-0.200557 0.176217,-0.264067 0.04698,-0.03523 0.118297,0.0097 0.176216,0 0.08283,-0.0138 0.573171,-0.175817 0.704351,-0.08837 0.319834,0.213223 0.597606,0.540736 0.881082,0.792716 0.109718,0.09753 0.256377,0.153127 0.351918,0.264583 0.08545,0.09969 0.09744,0.247394 0.176216,0.352434 0.117438,0.117437 0.234999,0.234478 0.352433,0.351916 0,0.02936 -0.0163,0.06394 0,0.08837 0.01723,0.212745 0.264353,0.146628 0.352433,0.264067 0.05571,0.07427 0.02221,0.198416 0.08785,0.264066 0.09284,0.09284 0.249908,0.09419 0.3524325,0.176217 0.05127,0.04101 0.03585,0.136827 0.08837,0.176216 0.482896,0.362172 1.762532,0.175751 2.289783,0 0.228097,-0.07603 0.471885,-0.217466 0.704867,-0.264066 0.08637,-0.01728 0.182286,0.03271 0.264066,0 0.0771,-0.03084 0.117497,-0.117497 0.176217,-0.176217 0.08808,0 0.177186,0.01448 0.264066,0 0.229055,-0.03818 0.773647,-0.260382 0.968934,0 0.05571,0.07427 0.04008,0.184457 0.08785,0.264067 0.04273,0.07121 0.130156,0.107126 0.176216,0.176216 0.483911,0.725869 0.239501,0.479003 0.6165,1.233 0.319974,0.639948 0.02475,-0.05074 0.352433,0.4408 0.0764,0.114596 0.01971,0.425146 0.08837,0.528133 0.03642,0.05462 0.146341,0.02965 0.1757,0.08837 0.03245,0.0649 0.0563,0.116966 0.07648,0.163815 l 0.485243,-0.280086 V 2.150257 Z', },
        bottomRight: { x: -55, y: -13, shape: 'M 13.097217,7.0698088e-4 C 12.905856,-0.00980302 12.313993,0.09977698 12.154122,0.13609898 c -0.154179,0.03503 -0.288305,0.145381 -0.445451,0.162781 -0.105213,0.01164 -0.202202,-0.08338 -0.307991,-0.07958 -0.601312,0.02153 -1.859226,0.561385 -2.182296,1.12758002 -0.04115,0.07212 0.0068,0.168671 -0.01395,0.249081 -0.121756,0.472381 0.105546,0.355507 0.08372,0.752925 -0.0036,0.06555 -0.07605,0.117385 -0.07235,0.182935 0.01247,0.223247 0.226717,0.412361 0.214457,0.63562 -0.0051,0.0927 -0.110556,0.153146 -0.137976,0.241846 C 9.257545,3.521655 9.358335,3.868933 9.140357,3.900213 8.85478,3.941193 8.633406,3.354267 8.428255,3.237204 8.165026,3.087005 8.293568,3.259134 8.003475,3.026881 7.934725,2.971821 7.899662,2.879394 7.826742,2.829994 7.570229,2.656273 6.738049,2.28785 6.427344,2.19179 6.213879,2.12579 6.064525,2.20582 5.864071,2.22331 5.739981,2.23413 5.583737,2.119529 5.490967,2.20264 c -0.03089,0.02771 -0.0044,0.08308 -0.0067,0.12454 -0.0068,0.124372 -0.01335,0.248727 -0.02015,0.373104 -0.01112,0.202473 0.01182,0.260055 -0.0863,0.432015 -0.01454,0.02551 -0.06983,0.02934 -0.06563,0.05839 0.01319,0.0919 0.115688,0.163099 0.110588,0.255799 -0.05292,0.96353 -0.172893,0.279536 -0.36897,1.040246 -0.04145,0.160823 0.01878,0.337593 -0.02739,0.497128 C 4.992765,5.100145 4.87652,5.176134 4.82281,5.284618 4.73542,5.461116 4.696979,5.659385 4.605769,5.833939 4.558329,5.924729 4.159586,6.308494 4.080736,6.304194 4.015186,6.300594 3.963351,6.235444 3.897801,6.231844 3.746317,6.223544 3.723343,6.332273 3.583092,6.276804 3.410424,6.208514 3.28255,6.031442 3.099401,6.000852 2.994994,5.983412 2.887716,6.072232 2.785208,6.045812 2.405039,5.947822 2.106711,5.693235 1.751679,5.552819 1.557251,5.475929 1.377602,5.793915 1.17497,5.832905 1.071019,5.852905 0.959407,5.839405 0.860778,5.877865 0.581225,5.986851 0.477939,6.102789 0.277351,6.282491 0.189881,6.360851 -0.063526,6.430149 0.014834,6.517619 0.146253,6.664311 0.410408,6.612089 0.564155,6.735177 1.197055,7.24189 1.004054,7.040199 1.714989,7.359428 2.047268,7.508629 2.260978,7.73399 2.623977,7.84622 2.698007,7.86911 3.090781,7.79547 3.187251,7.8147 c 0.09105,0.01815 0.150785,0.119827 0.241845,0.137977 0.143964,0.02869 0.283953,-0.185205 0.438733,-0.03824 0.16578,0.04273 0.03444,0.344863 0.09663,0.504362 0.04266,0.109419 0.192468,0.153103 0.235128,0.262516 0.05333,0.136771 -4.7e-4,0.297133 0.03824,0.438733 0.01548,0.05664 0.08797,0.08017 0.117823,0.130742 0.20303,0.344035 0.178571,0.482757 0.201021,0.8847 0.0037,0.06555 0.05528,0.124103 0.05168,0.189653 -0.06721,1.223636 -0.578718,2.253373 -1.804541,2.17041 L 7.340484,15.115031 18.797149,8.500448 V 3.796342 C 18.455424,3.388313 18.142267,3.048964 17.98738,2.951432 17.706521,2.774577 17.578267,2.70226 17.523325,2.67548 17.526825,2.65843 17.466255,2.575407 17.150738,2.281706 16.819563,1.973426 16.420949,1.853138 16.065533,1.598543 15.825116,1.426336 15.368374,0.81570198 15.118304,0.67301898 c -0.14869,-0.08484 -0.341722,-0.06656 -0.490409,-0.151412 -0.268544,-0.153228 -0.236483,-0.325166 -0.667143,-0.348816 -0.105697,-0.0058 -0.209782,0.06292 -0.314193,0.04548 -0.904851,-0.151163 0.499134,-0.159968 -0.54932,-0.21755799912 z', },
        bottomLeft: { x: -87, y: -18, shape: 'm 8.2889099,0.00119245 c -0.01264,0.0019 -0.02264,0.0061 -0.02946,0.01292 -0.02076,0.02076 0.02443,0.07155 0,0.08785 -0.07725,0.0515 -0.189792,0.03266 -0.264066,0.08837 -0.05252,0.03939 -0.03659,0.13469 -0.08785,0.1757 -0.102527,0.08203 -0.2542979,0.08899 -0.3524329,0.176216 -0.02079,0.01848 -0.601464,0.62037795 -0.704867,0.79271695 -0.151213,0.252023 -0.207605,0.510408 -0.264066,0.792716 -0.01152,0.05758 0.02626,0.123697 0,0.176217 -0.03714,0.07427 -0.13908,0.101947 -0.176217,0.176216 -0.02626,0.05252 0.01424,0.119257 0,0.176217 -0.01592,0.06369 -0.05849,0.117497 -0.08785,0.176217 -0.02936,0.02936 -0.07524,0.04846 -0.08837,0.08785 -0.069,0.207009 -0.05659,0.505489 -0.176216,0.704866 -0.03378,0.0563 -0.129796,0.04143 -0.176217,0.08785 -0.158105,0.158104 -0.134105,0.434551 -0.264067,0.6165 -0.146797,0.205515 -0.437913,0.261694 -0.616499,0.440283 -0.04642,0.04642 -0.03207,0.142437 -0.08837,0.176217 -0.103801,0.06228 -0.237077,0.05009 -0.351917,0.08837 -0.149991,0.05 -0.285943,0.141916 -0.440283,0.176216 -0.292176,0.06493 -1.273729,-0.111927 -1.497583,0 C 1.747696,5.6481424 0.835379,6.0617964 0,6.5971794 v 2.724898 l 11.456665,6.6145826 4.283459,-2.473234 c 0.03303,-0.07864 0.06491,-0.157582 0.09405,-0.237711 0.03879,-0.106669 0.03517,-1.092302 0,-1.233 -0.183255,-0.733119 0.006,0.106428 -0.176216,-0.440283 -0.04404,-0.132117 0.08808,-0.08843 0,-0.264583 -0.01313,-0.02627 -0.06709,0.02077 -0.08785,0 -0.27327,-0.273269 -0.786045,-0.896985 -0.6165,-1.3208496 0.01076,-0.02691 0.193387,-0.5051 0.264067,-0.52865 0.279268,-0.09309 0.50127,-0.0067 0.616499,-0.352433 0.103053,-0.309158 0,-1.142478 0,-1.497066 0,-0.41954 0.09684,-1.999782 0,-2.2903 -0.02537,-0.0761 -0.522133,-0.69595 -0.528133,-0.70435 -0.203281,-0.284593 -0.247228,-0.423443 -0.52865,-0.704866 -0.07485,-0.07485 -0.189216,-0.101367 -0.264066,-0.176217 -0.04642,-0.04642 -0.03375,-0.139797 -0.08837,-0.176216 -0.04886,-0.03257 -0.118297,0.0097 -0.176216,0 -0.119405,-0.0199 -0.23448,-0.05849 -0.351917,-0.08785 0,-0.02936 0.02076,-0.0676 0,-0.08837 -0.06228,-0.06228 -0.176503,0 -0.264583,0 h -1.497067 c -0.383495,0 -1.306864,0.107361 -1.585433,-0.264067 -0.173129,-0.230832 -0.02726,-0.37207 -0.08837,-0.6165 -0.03835,-0.153383 -0.145207,-0.285247 -0.176217,-0.440283 -0.02879,-0.143946 0.02413,-0.295481 0,-0.440283 -0.02895,-0.17373 -0.3589531,-0.243994 -0.4402831,-0.352433 -0.05571,-0.07427 -0.04633,-0.181544 -0.08785,-0.26458395 -0.09052,-0.181055 -0.190138,-0.0134 -0.352433,-0.175699 -0.06565,-0.06565 -0.04633,-0.181544 -0.08785,-0.264584 -0.03874,-0.07748 -0.838252,-0.569631 -1.027844,-0.541052 z', },
        left: { x: -87, y: -71, shape: 'M 4.8286458,0 0,2.787944 V 16.01711 l 3.7248372,2.150773 c 0.014125,-0.0034 0.028442,-0.0064 0.042891,-0.0088 0.4133062,-0.06888 0.3974949,-0.02348 0.3214275,0.02119 0.1154461,-0.04806 0.3230765,-0.130649 0.7353556,-0.285254 0.3853538,-0.115607 0.7197661,0.189056 1.0572997,0.264066 0.143302,0.03185 0.301019,-0.04642 0.440283,0 0.224557,0.07485 0.391944,0.277584 0.6165,0.352434 0.03812,0.0127 1.113067,0.03998 1.233,0 0.407686,-0.135895 -0.07476,-1.686891 0.440283,-2.201933 0.09403,-0.09403 0.531928,-0.647217 0.704867,-0.704867 0.111411,-0.03714 0.247393,0.05252 0.352433,0 0.02626,-0.01313 -0.02255,-0.06907 0,-0.08785 0.162643,-0.135535 0.368802,-0.213018 0.528133,-0.352433 0.261687,-0.228978 0.458472,-0.634687 0.704867,-0.881083 0.347959,-0.347959 1.084409,-0.583902 1.320849,-1.056783 0.01827,-0.03654 0.02881,-0.401863 0,-0.440283 -0.318721,-0.424963 -0.880566,-0.820424 -0.880566,-1.409217 0,-0.276473 -0.05643,-1.000352 0.176216,-1.232999 0.04152,-0.04152 0.120511,0.01857 0.176217,0 0.345244,-0.11508 0.388067,-0.567788 0.440283,-0.881083 0.04495,-0.269671 -0.315613,-1.27266 -0.440283,-1.497067 -0.06049,-0.108886 -0.208362,-0.153172 -0.264067,-0.264583 -0.08808,-0.176157 -0.191438,-0.345269 -0.264583,-0.528133 -0.02181,-0.05452 0.03257,-0.127357 0,-0.176217 -0.05872,-0.08808 -0.189214,-0.101367 -0.264066,-0.176216 -0.153728,-0.153728 -0.07501,-0.04881 -0.176217,-0.352434 -0.06613,-0.08266 -0.197938,-0.09356 -0.264067,-0.176216 -0.058,-0.0725 -0.02272,-0.198417 -0.08837,-0.264067 -0.09284,-0.09285 -0.234996,-0.117497 -0.352434,-0.176217 -0.02936,0 -0.06396,0.01707 -0.08785,0 C 9.746647,5.518558 9.593122,5.342077 9.40459,5.211555 8.769098,4.771599 7.558803,4.426265 7.202657,3.713972 7.078005,3.464668 7.267827,2.912369 7.291027,2.657189 c 0.03971,-0.436858 0.05559,-1.228553 0,-1.673283 C 7.272947,0.839285 7.093972,0.809363 7.026444,0.719323 6.970734,0.645053 7.004244,0.520906 6.938594,0.455256 c -0.04152,-0.04152 -0.118758,0.01209 -0.176216,0 C 6.2606364,0.34964 5.7658414,0.214067 5.2653117,0.102836 5.1193829,0.070408 4.9738181,0.035747 4.8286458,0 Z M 4.0891561,18.180286 c -0.2045597,0.08516 -0.079105,0.04645 0,0 z', },
    },
    LOCATION_TOKEN_DATA: {
        mines: { id: 'mines', fill: '#dd2832', shape: 'M 5.844496,11.641666 0,3.8490722 2.342524,0 h 6.932957 l 2.366186,3.8490722 z' },
        forest: { id: 'forest', fill: '#774927', shape: 'M 5.8208367,1.0253556e-8 A 5.8210085,5.8210085 0 0 0 3.167148,0.64012901 V 1.40483 H 2.029252 A 5.8210085,5.8210085 0 0 0 0,5.820833 5.8210085,5.8210085 0 0 0 0.880893,8.898479 h 0.679912 v 0.887702 a 5.8210085,5.8210085 0 0 0 4.2600317,1.855486 5.8210085,5.8210085 0 0 0 2.743186,-0.687761 V 9.968851 h 1.339921 A 5.8210085,5.8210085 0 0 0 11.642191,5.820833 5.8210085,5.8210085 0 0 0 5.8208367,1.0253556e-8 Z' },
        quary: { id: 'quary', fill: '#85878b', shape: 'm 0,10.982703 4.2806915,0.5711 4.6657351,0.08786 1.6080904,-2.4381608 1.08715,-3.778054 V 4.7884552 L 6.9985918,0.0219559 4.0315567,0 C 3.5506275,1.1180172 2.6814057,2.3032777 0.52093042,3.7121589 L 0.02264964,7.9954172 Z' },
        farms: { id: 'farms', fill: '#a452a9', shape: 'm 1.1015758,0.067292 c 3.3598025,4.803393 -3.6051439,7.955289 -0.07104,11.574375 H 10.567642 C 7.6352838,6.842742 14.068107,5.664205 10.567642,0 Z' },
        market: { id: 'market', fill: '#ff601e', shape: 'M 5.821112,0 A 1.0355433,0.91947589 0 0 0 4.785606,0.9194423 1.0355433,0.91947589 0 0 0 5.093265,1.5730933 L 0,6.6142713 H 1.11921 L 0.852019,11.641667 h 9.938183 L 10.489199,6.5995043 h 1.152468 L 6.53122,1.5888433 A 1.0355433,0.91947589 0 0 0 6.856617,0.9194423 1.0355433,0.91947589 0 0 0 5.821112,0 Z', },
        treasury: { id: 'treasury', fill: '#FFD700', shape: 'M 0,9.6131939 H 23.283333 L 19.994255,1.8520833 H 3.289108 Z' },
        temple: { id: 'temple', fill: '#1e78c2', shape: 'M 0.301553,0 0,11.641667 H 11.641667 L 11.124575,0 H 9.873839 v 4.29651 h -0.0774 A 4.1824964,4.4810509 0 0 0 5.820589,1.201245 4.1824964,4.4810509 0 0 0 1.845249,4.29651 h -0.0774 V 0 Z', },
    },
    TEMPLE_CONSTRUCTION_DATA: [
        { id: 'temple', fill: '#00112b', shape: 'm 6.1e-5,20.140842 h 23.283228 v 3.354951 H 6.1e-5 Z' }, // 0
        { id: 'temple', fill: '#002255', shape: 'M 2.063098,13.640511 V 20.14089 H 2.6e-5 v 3.354834 H 23.283331 V 20.14089 h -2.161867 v -6.500379 z' }, // 1
        { id: 'temple', fill: '#003380', shape: 'M 0.532505,0 0.045066,20.14089 H 1.6e-5 v 3.354834 H 23.283317 V 20.14089 H 21.121815 V 13.640511 H 2.246512 L 1.932688,0 Z' }, // 2
        { id: 'temple', fill: '#0044aa', shape: 'M 0.532322,0 0.044883,20.14089 h -0.0447 v 3.354834 h 23.28294 V 20.14089 h -0.0084 L 22.811651,0 H 21.411453 L 21.080922,13.640511 H 2.246301 L 1.932477,0 Z' }, // 3
        { id: 'temple', fill: '#0055d4', shape: 'M 0.532505,0 0.0447,20.14089 H 0 v 3.354834 H 23.283305 V 20.14089 h -0.0084 L 22.811475,0 H 21.41127 L 21.081105,13.640511 H 4.840945 L 4.46683,2.795695 H 3.299809 L 2.906083,13.640511 H 2.246484 L 1.93266,0 Z' }, // 4
        { id: 'temple', fill: '#0066ff', shape: 'M 0.532505,0 0.0447,20.14089 H 0 v 3.354834 H 23.283305 V 20.14089 h -0.0084 L 22.811475,0 H 21.41127 L 21.081105,13.640511 H 20.757842 L 20.383727,2.795695 H 19.217078 L 18.823345,13.640511 H 4.840938 L 4.46683,2.795695 H 3.299809 L 2.906083,13.640511 H 2.246484 L 1.93266,0 Z' }, // 5
        { id: 'temple', fill: '#2a7fff', shape: 'M 0.532681,0 0.044876,20.14089 h -0.0447 v 3.354834 H 23.283123 V 20.14089 h -0.008 L 22.811659,0 H 21.411454 L 21.08093,13.640511 h -0.179793 c -0.0272,-0.390024 -0.08858,-0.761405 -0.181249,-1.114143 L 20.383902,2.795695 H 19.217247 L 18.96626,9.6976 C 15.514988,6.588312 8.355159,6.651564 4.699824,9.555489 L 4.466633,2.795695 H 3.299985 L 2.978169,11.65562 C 2.687948,12.256434 2.505701,12.917815 2.459136,13.640511 H 2.246287 L 1.93247,0 Z' }, // 6
    ],
    SHIP_DATA: {
        setupDrifts: [{ x: 50, y: 0 }, { x: 0, y: 50 }, { x: -50, y: 0 }, { x: 0, y: -50 }],
        shape: 'm 3.1837659,11.741623 -0.73245,-0.864642 0.90903,-0.575723 C 3.4511459,7.3309195 -0.35658408,7.0800105 0.02718592,10.270958 1.4698159,16.20431 4.7400959,20.482233 10.299366,21.130517 l 17.31042,-0.04701 c 1.91709,-0.682178 1.51763,-4.727232 3.68534,-6.513602 0.27594,-1.215889 0.86841,-2.220763 0,-4.199558 h -3.34252 c -0.57159,2.084461 -1.42643,2.75254 -2.22834,3.685324 -2.01669,0.117795 -3.8819,0.03355 -5.65654,-0.171408 L 20.239186,0 c -7.74693,1.576227 -10.8318399,6.001451 -8.39912,13.798561 z',
    },
    CARGO_ITEM_DATA: {
        gem: { fill: '#dd2832', shape: 'M 5.844496,11.641666 0,3.8490722 2.342524,0 h 6.932957 l 2.366186,3.8490722 z' },
        wood: { fill: '#a16335', shape: 'M 5.8208367,1.0253556e-8 A 5.8210085,5.8210085 0 0 0 3.167148,0.64012901 V 1.40483 H 2.029252 A 5.8210085,5.8210085 0 0 0 0,5.820833 5.8210085,5.8210085 0 0 0 0.880893,8.898479 h 0.679912 v 0.887702 a 5.8210085,5.8210085 0 0 0 4.2600317,1.855486 5.8210085,5.8210085 0 0 0 2.743186,-0.687761 V 9.968851 h 1.339921 A 5.8210085,5.8210085 0 0 0 11.642191,5.820833 5.8210085,5.8210085 0 0 0 5.8208367,1.0253556e-8 Z' },
        stone: { fill: '#85878b', shape: 'm 0,10.982703 4.2806915,0.5711 4.6657351,0.08786 1.6080904,-2.4381608 1.08715,-3.778054 V 4.7884552 L 6.9985918,0.0219559 4.0315567,0 C 3.5506275,1.1180172 2.6814057,2.3032777 0.52093042,3.7121589 L 0.02264964,7.9954172 Z' },
        cloth: { fill: '#a452a9', shape: 'm 1.1015758,0.067292 c 3.3598025,4.803393 -3.6051439,7.955289 -0.07104,11.574375 H 10.567642 C 7.6352838,6.842742 14.068107,5.664205 10.567642,0 Z' },
        silver: { fill: '#cccccc', shape: 'M 0,5.6879918 4.8700997,9.6131062 H 18.346276 L 23.283069,5.5987858 18.21283,1.8520833 H 4.936812 Z' },
        silver_extra: { fill: '#cccccc', shape: '' },
        gold: { fill: '#ffae47', shape: 'M 0,9.6131939 H 23.283333 L 19.994255,1.8520833 H 3.289108 Z' },
        gold_extra: { fill: '#ffae47', shape: '' },
        empty: { fill: '#ffffff', shape: 'm 0,0 0,0 0,0 0,0 z' },
    },
    ICON_DATA: {
        anchored: { fill: '#00ff00', shape: 'M 12.107155,0.71329703 H 7.3229549 c -1.24428,0 -2.24586,1.00157997 -2.24586,2.24585997 v 0.92501 c 0,1.24428 1.00158,2.24586 2.24586,2.24586 h 7.6181401 l -0.0682,1.99833 -3.91036,-0.0196 c -0.39157,0.0496 -0.71418,0.27765 -0.66456,0.669209 l -0.0145,1.54667 c 0.0149,0.30235 0.24293,0.62445 0.66921,0.66404 l 3.91088,0.0191 -0.17622,16.70906 c -3.88612,-0.74792 -6.8257101,-3.81586 -7.1980101,-7.67706 l 2.15129,-0.015 c 0.30235,-0.015 0.5897801,-0.33207 0.3617301,-0.65423 l -3.7434401,-6.45283 c -0.19334,-0.23294 -0.61962,-0.27254 -0.72863,-0.0248 l -3.9000299,6.34484 c -0.19822,0.28256 0.0299,0.60453 0.33228,0.58962 h 1.8489899 c 0.40239,6.31474 5.74124,11.32499 12.4426501,11.38846 6.70143,0.0635 12.09861,-4.80969 12.63799,-11.07995 h 1.84898 c 0.33705,0.0744 0.624324,-0.24301 0.430984,-0.47594 l -3.742924,-6.45335 c -0.19334,-0.23295 -0.61962,-0.27212 -0.72864,-0.0243 l -3.90002,6.34483 c -0.19822,0.28256 0.0299,0.60455 0.33228,0.58963 l 2.15077,-0.015 c -0.48026,3.78201 -3.38903,6.8657 -7.35924,7.48584 l 0.24546,-16.53077 3.91088,0.0196 c 0.39157,-0.0496 0.71366,-0.27763 0.66404,-0.66921 l 0.0145,-1.54668 c -0.0149,-0.30235 -0.24293,-0.624429 -0.66921,-0.664029 l -3.91087,-0.0191 0.0693,-2.04742 h 7.21868 c 1.24428,0 2.24585,-1.00158 2.24585,-2.24586 v -0.92501 c 0,-1.24428 -1.00157,-2.24585997 -2.24585,-2.24585997 h -4.33721 z' },
        not_anchored: { fill: '#ff0000', shape: 'm 3.5520105,11.140414 -3.03872997,3.69523 c -0.79032,0.96106 -0.65288,2.37082 0.30818,3.16113 l 0.71444997,0.58753 c 0.96106,0.79032 2.37082,0.65289 3.16114,-0.30817 l 4.83875,-5.8841 1.5001505,1.32193 -2.4988505,3.00784 c -0.2104,0.33394 -0.23916,0.72797 0.0948,0.93835 l 1.18544,0.99356 c 0.2429905,0.18053 0.6366105,0.20899 0.9379405,-0.0951 l 2.49878,-3.00855 12.79383,10.74904 c -3.04599,2.52652 -7.28272,2.84836 -10.5015,0.68344 l 1.35483,-1.67114 c 0.18045,-0.24306 0.11812,-0.66646 -0.27556,-0.69494 l -7.3617205,-1.20723 c -0.30272,10e-4 -0.60407,0.30549 -0.48196,0.54704 l 2.4234905,7.04229 c 0.0923,0.33257 0.48592,0.36088 0.66646,0.11786 l 1.1744,-1.42812 c 5.13296,3.70007 12.39381,2.75876 16.69931,-2.37696 4.30552,-5.13572 3.96964,-12.39964 -0.53079,-16.79887 l 1.17441,-1.4281202 c 0.27154,-0.21308 0.20884,-0.63657 -0.0939,-0.63518 l -7.3618,-1.20797 c -0.30273,0.001 -0.60374,0.30575 -0.48157,0.54736 l 2.42348,7.0422802 c 0.0923,0.33257 0.48593,0.36089 0.66647,0.11786 l 1.3545,-1.67074 c 2.6161,2.77313 3.15035,6.97844 1.10761,10.43884 l -12.61213,-10.68928 2.49917,-3.00823 c 0.2104,-0.3339402 0.23886,-0.7275602 -0.0951,-0.9379502 l -1.18542,-0.99359 c -0.243,-0.18054 -0.6366,-0.20898 -0.93794,0.0951 l -2.49879,3.0085502 -1.53743,-1.3538802 4.58502,-5.57557 c 0.79032,-0.96106 0.65288,-2.37082 -0.30818,-3.16114 l -0.71446,-0.58753005 c -0.96106,-0.79032 -2.37081,-0.65289 -3.16114,0.30818 L 9.2828305,4.1714238 Z' },
        restricted: { fill: '#ff0000', shape: 'm 10.932082,11.058785 a 37.540698,37.540698 0 0 0 0.12674,53.090334 37.540698,37.540698 0 0 0 53.091465,-0.12784 37.540698,37.540698 0 0 0 -0.12923,-53.090314 37.540698,37.540698 0 0 0 -53.089195,0.12784 z m 7.36853,7.33313 a 27.14481,27.14481 0 0 1 34.149345,-3.47426 L 14.989882,52.558759 a 27.14481,27.14481 0 0 1 3.31073,-34.166844 z m 4.33185,41.770374 37.487105,-37.668234 a 27.14481,27.14481 0 0 1 -3.33779,34.193974 27.14481,27.14481 0 0 1 -34.149315,3.47426 z' },
        sun: { fill: '#ffff00', shape: 'M 14.24823,0 C 12.18394,1.02714 12.06438,3.47156 12.46591,6.08025 A 8.2793589,8.2793589 0 0 0 9.0583604,7.50755 C 7.0629904,6.23436 5.03646,5.09455 4.30258,3.86023 3.58392,6.00235 5.14954,7.78564 7.2155804,9.32501 A 8.2793589,8.2793589 0 0 0 5.70921,12.85244 C 3.39295,13.36254 1.19691,13.9958 0,13.76194 c 1.13857,1.86736 3.31545,2.02204 5.67459,1.68259 a 8.2793589,8.2793589 0 0 0 1.5652804,3.71915 C 6.01058,21.10192 4.94064,23.00546 3.95893,23.66624 c 2.08212,0.50481 3.7070004,-0.85735 5.1149404,-2.7068 a 8.2793589,8.2793589 0 0 0 3.8400696,1.48001 c 0.49769,2.21246 1.07248,4.28234 0.84801,5.43119 1.82644,-1.11362 2.01398,-3.22137 1.70377,-5.52059 a 8.2793589,8.2793589 0 0 0 3.668,-1.73891 c 1.94867,1.23739 3.86831,2.31323 4.53254,3.30005 0.51673,-2.13129 -0.92209,-3.78333 -2.83807,-5.21415 a 8.2793589,8.2793589 0 0 0 1.27641,-3.7052 c 2.24816,-0.50276 4.40982,-1.08898 5.76605,-0.74414 -1.00689,-2.0236 -3.37632,-2.17695 -5.92677,-1.80402 A 8.2793589,8.2793589 0 0 0 20.34605,9.08419 c 1.27988,-2.00372 2.42419,-4.04455 3.66386,-4.78161 -2.18485,-0.733 -3.99662,0.90904 -5.55677,3.03598 A 8.2793589,8.2793589 0 0 0 15.05231,6.03529 C 14.53816,3.69099 13.88958,1.41053 14.24823,0 Z' },
        moon: { fill: '#ececec', shape: 'm 13.884178,5.9532424 a 8.2793589,8.2793589 0 0 0 -8.2795992,8.2790796 8.2793589,8.2793589 0 0 0 8.2795992,8.279603 8.2793589,8.2793589 0 0 0 3.10627,-0.60668 8.2793589,8.2793589 0 0 1 -5.22035,-7.672923 8.2793589,8.2793589 0 0 1 5.22035,-7.6729096 8.2793589,8.2793589 0 0 0 -3.10627,-0.60617 z' },
        ocean_wave: { fill: '#008080', shape: 'M 8.8195982,17.929684 C 16.303058,19.391837 38.840468,7.7385512 44.537618,19.18838 36.072838,17.036085 15.514138,28.909347 8.8195982,17.929684 Z' },
        favor_stamp_outer: { fill: '#aa0000', shape: 'm 0.4156,11.20183 c -0.324468,1.146716 -0.06967,2.061739 0.175337,2.980665 0.367351,1.329617 0.249598,2.659214 1.578001,3.988831 2.6234,1.55679 4.65104,2.517818 8.678999,5.479173 0.710112,0.742195 1.647813,0.460259 2.586167,0.175377 l 3.944999,-0.52601 c 2.131408,-0.655662 3.815146,-1.886881 5.1285,-3.594324 0.529396,-0.848476 1.1355,-1.390113 1.4465,-3.112167 v -1.534177 c 1.064699,-1.032293 1.702661,-2.095083 1.139665,-3.24365 C 25.396562,10.136233 25.373301,8.534554 23.25277,7.43221 22.260835,6.504685 21.790647,5.407482 21.148771,4.013209 21.522743,4.293214 17.976671,-1.177837 14.705267,1.295549 13.776689,1.663641 12.653079,1.511635 11.373937,0.944876 10.161655,-0.324942 8.578789,0.350785 6.90294,1.5147 4.927937,2.501786 3.247711,3.57857 3.922269,5.372049 4.215676,7.37243 2.906116,8.139767 1.730602,9.0102 Z' },
        favor_stamp_inner: { fill: '#aa0000', shape: 'm 13.170423,3.968953 c -4.707544,-1e-6 -8.546875,3.605207 -8.546875,8.066406 0,4.461199 3.839331,8.064453 8.546875,8.064453 4.707543,0 8.548828,-3.603255 8.548828,-8.064453 0,-4.461199 -3.841285,-8.066406 -8.548828,-8.066406 z m 0,0.611328 c 4.396182,0 7.9375,3.345137 7.9375,7.455078 0,4.109941 -3.541318,7.453125 -7.9375,7.453125 -4.396183,0 -7.935547,-3.343184 -7.935547,-7.453125 0,-4.109941 3.539364,-7.455079 7.935547,-7.455078 z' },
        fluctuation_arrow_up: { fill: '#77FF99', shape: 'M 6.502963,8.866642 V 7.347872 H 8.484236 L 4.242119,0 0,7.347872 h 1.981791 v 1.51877 z' },
        fluctuation_arrow_down: { fill: '#FF5F5F', shape: 'M 1.981274,0 V 1.51877 H 0 L 4.242118,8.866642 8.484237,1.51877 H 6.502446 V 0 Z' },
        no_fluctuation_dash: { fill: '#000000', shape: 'M 0.11326315,3.0363643 H 8.3712692 v 2.794231 H 0.11326315 Z' },
        active_favor_check: { fill: '#66ff00', shape: 'M 4.511921,14.54515 12.967438,20.18216 27.148041,5.8254 13.143595,23.08874 Z' },
        half_wreath: { fill: '#54741a', shape: 'm 13.312971,22.603899 c -1.683564,0.14294 -3.064577,-0.97686 -4.450114,-1.8838 h 1.409289 c 0.820468,-1.45903 -0.08619,-1.70908 -1.330974,-1.72242 -0.369322,1.2877 -1.139907,0.83663 -1.800744,0.8612 -1.075145,0.0277 -1.804019,-0.25224 -1.017814,-1.879015 C 6.092584,16.92549 5.381553,16.64952 4.63507,16.414013 l -1.487564,0.07824 C 3.645668,16.29632 4.067076,15.5534 3.85216,14.848109 3.430323,14.173844 3.033915,13.474144 3.225801,12.186164 2.421246,12.337801 2.073062,11.982325 2.207987,11.090063 2.322066,10.290816 2.402408,9.457669 2.207987,8.34982 2.44176,7.228797 3.28754,7.506663 4.243596,8.036643 L 3.85216,5.2964 5.887749,4.435187 6.592384,5.218111 8.236537,4.356888 9.097762,4.591777 8.393127,5.374699 8.079948,7.097131 6.983839,7.488598 6.357519,8.193231 c -1.303459,2.314901 -0.203626,2.526939 0,3.523166 0.350932,-0.10033 1.905637,0.678369 1.252679,0.939511 -0.596367,0.238512 -0.169265,1.644144 0.0782,1.644144 0.574137,-0.33565 1.148293,0.05246 1.722449,0.313178 1.180683,0.668788 1.049249,1.556262 1.017794,2.427067 0.112129,0.757548 0.251948,1.492568 1.487564,1.330986 0.690984,-0.17687 0.959156,0.0078 1.39671,0.04934 z' },
    },
}

export default clientConstants;