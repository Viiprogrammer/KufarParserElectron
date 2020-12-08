// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
const {ipcRenderer, remote} = require('electron'),
    settings = require('electron-settings'),
    xl = require('excel4node'),
    dialog = remote.dialog,
    WIN = remote.getCurrentWindow();

let one_second = 1000,
    one_minute = one_second * 60,
    one_hour = one_minute * 60,
    startDate = new Date(),
    stoped = true,
    paused = false,
    face = document.getElementById('timer');

async function delay(ms){
    await new Promise(resolve => setTimeout(resolve, ms));
}

async function exportf() {
    let file = await dialog.showSaveDialog(WIN, {
        title: "Export file",
        defaultPath: "",
        buttonLabel: "Export",
        filters: [
            {name: 'Exel', extensions: ['xlsx']},
            {name: 'Text', extensions: ['txt']},
        ]
    });
    $("#savefselected").removeClass('d-none');
}
const requestAnimationFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
}());

function tick() {

    var now = new Date()
        , elapsed = now - startDate
        , parts = [];

    parts[0] = '' + Math.floor(elapsed / one_hour);
    parts[1] = '' + Math.floor((elapsed % one_hour) / one_minute);
    parts[2] = '' + Math.floor(((elapsed % one_hour) % one_minute) / one_second);

    parts[0] = (parts[0].length == 1) ? '0' + parts[0] : parts[0];
    parts[1] = (parts[1].length == 1) ? '0' + parts[1] : parts[1];
    parts[2] = (parts[2].length == 1) ? '0' + parts[2] : parts[2];

    face.innerHTML = '<strong>' + parts.join(':') + '</strong>';
    if (!stoped) {
        requestAnimationFrame(tick);
    }

}

function loadAreas(val) {
    let areas_el = document.getElementById('areas');
        default_opt = document.createElement('option');

    default_opt.innerHTML = 'Все';
    default_opt.value = '0';
    areas_el.innerHTML = '';
    areas_el.appendChild(default_opt);

    if (val == 0) {
        areas_el.disabled = true;
        return false;
    } else {
        areas_el.disabled = false;
    }
    let selected = regions.find((x) => x[0] === val);

    let areas = Object.entries(selected[1]['areas']).sort((a, b) => {
        return a[1]['order'] > b[1]['order'] ? 1 : -1;
    });

    for (let i = 1; i < areas.length; i++) {
        var opt = document.createElement('option');
        opt.innerHTML = areas[i][1]['labels']['ru'];
        opt.value = areas[i][0];
        areas_el.appendChild(opt);
    }
}
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function update_count() {
    let q = query();
    ipcRenderer.invoke('getCount', query()).then((result) => {
        document.querySelector('#ads_count').innerHTML = result.count;
    });
}

async function pause(el) {
    if (paused) {
        $("#pause_icon").show();
        $("#play_icon").hide();
        paused = false;
    } else {
        $("#play_icon").show();
        $("#pause_icon").hide();
        paused = true;
    }
}

async function start(el) {
    $('#actions').addClass('btn-group');
    $("#pause_btn").show();
    //Start timer
    if (!stoped) {
        stoped = true;
        paused = false;
        $('#actions').removeClass('btn-group');
        $("#pause_btn").hide();
        $("#pause_icon").show();
        $("#play_icon").hide();
        el.innerText = 'Старт'
        el.classList.add('btn-dark')
        el.classList.remove('btn-danger');
        return false;
    }
    stoped = false;
    startDate = new Date();
    tick();
    document.querySelector('#progress > div').style.width = '0%';
    var wb = new xl.Workbook();
    var ws = wb.addWorksheet('Sheet 1');
    el.innerText = 'Стоп'
    el.classList.remove('btn-dark')
    el.classList.add('btn-danger')
    let progress = 0;
    const delay_between = Number($("#between_requests").val()),
        delay_requests = Number($("#n_request_delay").val()),
        delay_n = Number($("#n_request_delay_count").val());
        delimiter = $("#deliminer").val().trim();
        phones_delimiter = $("#phones_deliminer").val().trim();
    let requests_counter = 0;

    let hiddened_count = 0, numbers_parsed = 0, ads_parsed = 0, errors = 0;
    let response, json, next = true, cursor = false;
    var title = wb.createStyle({
        font: {
            bold: true
        },
        alignment: { // §18.8.1
            horizontal: ['center'],
        },
    });

    ws.cell(1, 1)
        .string('Имя')
        .style(title);
    ws.cell(1, 2)
        .string('Номер')
        .style(title);
    ws.cell(1, 3)
        .string('Область')
        .style(title);
    ws.cell(1, 4)
        .string('Город / Район')
        .style(title);


    //wb.write(new Date().toISOString().substring(0,10)+'.xlsx');
    //return;
    while (next && !stoped) {
        if (!paused) {
            response = await fetch('https://cre-api.kufar.by/items-search/v1/engine/v1/search/rendered-paginated?' + query(cursor), {
                headers: {
                    'X-Segmentation': 'routing=web_generalist;platform=web;application=ad_view'
                }
            });

            if (response.status === 200) {
                json = await response.json();
                if (json.ads) {
                    for (let ad of json.ads) {
                        ads_parsed++;
                        if (ad.phone_hidden === false && ad.phone) {
                            numbers_parsed++;
                            if (ad.account_parameters !== undefined) {
                                const name = ad.account_parameters.find((x) => x.p === 'name');
                                const phones = ad.phone.split(',').join(phones_delimiter);
                                if (ad.company_ad === false) {
                                    if (name) {
                                        console.log(capitalizeFirstLetter(name.v.trim()), phones)
                                    }
                                }
                            }
                        } else hiddened_count++;
                    }
                }
                next = json.pagination.pages.find(x => x.label == 'next');
                if (next) {
                    cursor = next.token;
                } else {
                    stoped = true;
                    paused = false;
                    $("#pause_btn").hide();
                    $("#pause_icon").show();
                    $("#play_icon").hide();
                }
                let self = json.pagination.pages.find(x => x.label == 'self');
                document.querySelector('#pages_getted').innerHTML = self.num;
                document.querySelector('#hiddened').innerHTML = hiddened_count;
                document.querySelector('#parsed').innerHTML = numbers_parsed;
                document.querySelector('#ads_parsed').innerHTML = ads_parsed;
                document.querySelector('#progress > div').style.width = (self.num * 100) / (json.total / 42) + '%';
            } else {
                errors++;
                document.querySelector('#errors').innerHTML = errors;
            }

            if (delay_requests) requests_counter++;
            if (delay_requests && requests_counter === delay_n) {
                requests_counter = 0;
                await delay(delay_requests);
            } else if (delay_between) {
                await delay(delay_between);
            }
        } else {
            await delay(600);
        }

    }
}

function enforceMinMax(el) {
    if (el.value != "") {
        if (parseInt(el.value) < parseInt(el.min)) {
            el.value = el.min;
        }
        if (parseInt(el.value) > parseInt(el.max)) {
            el.value = el.max;
        }
    }
}

function query(cursor = false) {
    let filter = {};
    let seller = document.querySelector('[name="seller"]:checked').value;
    let condition = document.querySelector('[name="condition"]:checked').value;
    let delivery = document.querySelector('[id="delivery"]').checked;
    let installment = document.querySelector('[id="installment"]').checked;
    let withphoto = document.querySelector('[id="withphoto"]').checked;
    let maybetrade = document.querySelector('[id="maybetrade"]').checked;
    let cat = document.querySelector('[id="categories"]').value;
    let region = document.querySelector('[id="region"]').value;
    let area = document.querySelector('[id="areas"]').value;

    if (seller == 1) {
        filter.cmp = 0;
    } else if (seller == 2) {
        filter.cmp = 1;
    }

    if (condition == 1) {
        filter.cnd = 2;
    } else if (condition == 2) {
        filter.cnd = 1;
    }

    if (delivery) {
        filter.dle = 1;
    }

    if (installment) {
        filter.hlv = 1;
    }

    if (withphoto) {
        filter.oph = 1;
    }

    if (cat != 0) {
        filter.prn = cat;
    }

    if (maybetrade) {
        filter.pse = 1;
    }
    /*$price_min = $this->pricemin->value;
    $price_max = $this->pricemax->value;

    if($price_min || $price_max){
        $price_min *= 100;
        $price_max *= 100;
        $filter['prc'] = "r:{$price_min},{$price_max}";
    }

*/
    if (region != 0) {
        filter.rgn = region;
    }

    if (area != 0) {
        filter.ar = area;
    }


    filter.size = 42;
    filter.sort = 'lst.d';
    filter.cur = 'BYN';
    filter.lang = 'ru';
    if (cursor) {
        filter.cursor = cursor;
    }

    return $.param(filter);
}

update_count();