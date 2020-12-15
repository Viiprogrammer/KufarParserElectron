// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
const {ipcRenderer, remote} = require('electron'),
    settings = require('electron-settings'),
    xl = require('excel4node'),
    fs = require('fs-extra'),
    dialog = remote.dialog,
    WIN = remote.getCurrentWindow();
let one_second = 1000,
    one_minute = one_second * 60,
    one_hour = one_minute * 60,
    startDate = new Date(),
    stoped = true,
    paused = false,
    face = document.getElementById('timer'),
    export_file,
    wb = null,
    ws = null,
    title = null,
    info = null,
    interrupted = false,
    fields = ['Имя', 'Номер', 'Адрес магазина', 'Адрес компании', 'Сайт', 'Импортер', 'Кoнтактное лицо', 'Объявление'];

window.onerror = function(error, url, line) {
    fs.writeFile("error.log", `Error: ${error}\r\nLine:${line}\r\nUrl:${url}`, 'utf8', function(err) {
    });
};
async function delay(ms){
    await new Promise(resolve => setTimeout(resolve, ms));
}

async function exportf() {
    export_file = await dialog.showSaveDialog(WIN, {
        title: "Export file",
        defaultPath: "",
        buttonLabel: "Export",
        filters: [
            {name: 'Exel', extensions: ['xlsx']},
            {name: 'Text', extensions: ['txt']},
        ]
    });
    if(export_file && !export_file.canceled && export_file.filePath){
        fs.writeFile(export_file.filePath, '', function (err) {
            if (err) throw err;
            console.log('File is created successfully.');
        });
    }
    if(export_file && !export_file.canceled && export_file.filePath && !settings.hasSync('xlsx_alert')) {
        if(export_file.filePath.split('.').pop() === 'xlsx'){
            let remember = await dialog.showMessageBox({
                type: 'info',
                title: 'Минуточку',
                message: `Внимание! При экспорте в xlsx полученные в процессе данные будут сохранены в файл ТОЛЬКО после нажатия Стоп или при полнном завершения процесса.`,
                checkboxLabel: 'Не напоминать',
            });
            if(remember.checkboxChecked){
                settings.set('xlsx_alert', true)
            }
        }
    }
    return export_file;
    //if(!export_file.canceled) $("#savefselected").removeClass('d-none');
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
function interface_status(enable){
    if(enable){
        $('[name="condition"]').attr('disabled', false);
        $('[name="seller"]').attr('disabled', false);
        $('#delivery').attr('disabled', false);
        $('#installment').attr('disabled', false);
        $('#withphoto').attr('disabled', false);
        $('#maybetrade').attr('disabled', false);
        $('#region').attr('disabled', false);
        console.log($('#region').val())
        $('#areas').attr('disabled', $('#region').val() == 0);
        $('button[onclick="exportf()"]').attr('disabled', false);
        $('#categories').attr('disabled', false);
        $('[data-target="#settings"]').attr('disabled', false);
    } else {
        $('[name="condition"]').attr('disabled', true);
        $('[name="seller"]').attr('disabled', true);
        $('#delivery').attr('disabled', true);
        $('#installment').attr('disabled', true);
        $('#withphoto').attr('disabled', true);
        $('#maybetrade').attr('disabled', true);
        $('#region').attr('disabled', true);
        $('#areas').attr('disabled', true);
        $('button[onclick="exportf()"]').attr('disabled', true);
        $('#categories').attr('disabled', true);
        $('[data-target="#settings"]').attr('disabled', true);
    }
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
async function exel_save(){
    return new Promise((resolve, reject) => {
        fs.open(export_file.filePath,'r+', async function(err,data) {
            if(err) {
                console.log(err)
                let resp = await dialog.showMessageBox({
                    type: 'info',
                    title: 'Ошибка',
                    message: `Невозможно экспортировать файл, возможно от открыт в другом приложении`,
                    detail: err.toString(),
                    buttons: ['Не сохранять', 'Попробовать еще раз']
                });
                console.log(resp)
                if (resp.response === 1) {
                    await exel_save();
                } else if(resp.response === 0) {
                    resolve();
                    console.log('ig')
                }
            } else {
                wb.write(export_file.filePath);
                resolve();
            }
        });
    })
}

async function start(el) {
    if(stoped) {
        if (export_file === undefined || export_file.canceled) {
            let file_selected = await dialog.showMessageBox({
                type: 'info',
                title: 'Ошибка',
                message: `Не указан файл экспорта`,
                buttons: ['Прервать', 'Выбрать файл']
            })
                .then(async ({response}) => {
                    if (response) {
                        return await exportf();
                    }
                });
            console.log(file_selected)
            if (export_file === undefined || export_file.canceled == true || !export_file.filePath) {
                console.log(export_file)
                return false;
            }
        }
    }
    const export_file_ext = export_file.filePath.split('.').pop();
    //Остановка парсинга
    if (!stoped) {
        interrupted = true;
        return false;
    }

    const delay_between = Number($("#between_requests").val()),
        delay_requests = Number($("#n_request_delay").val()),
        delay_n = Number($("#n_request_delay_count").val()),
        delimiter = $("#deliminer").val().trim(),
        phones_delimiter = $("#phones_deliminer").val().trim(),
        ads_on_page = Number($("#ads_on_page").val()),
        dublicate = document.querySelector('[id="dublicate"]').checked;

    let hiddened_count = 0,
        numbers_parsed = 0,
        ads_parsed = 0,
        numbers_ads_parsed = 0,
        errors = 0,
        response,
        json,
        next = true,
        cursor = false,
        requests_counter = 0,
        progress = 0;

    //Exel
    if(export_file_ext == 'xlsx') {
        wb = new xl.Workbook(), ws = wb.addWorksheet('Sheet 1');
        title = wb.createStyle({font: {bold: true}, alignment: {horizontal: ['center']}}),
        info = wb.createStyle({alignment: {horizontal: ['center']}});
        for (let index = 0; index != fields.length; index++){
            console.log(fields[index])
            ws.cell(1, index+1)
                .string(fields[index])
                .style(title);
            ws.column( index+1).setWidth(70);
        }
    } else if(export_file_ext == 'txt'){
        try {
            let head_string = '';
            for (let index = 0; index != fields.length; index++){
                head_string += fields[index]+(index != fields.length-1 ? delimiter : "\r\n");
            }
            fs.writeFileSync(export_file.filePath, head_string, { mode: 0o755 });
        } catch(err) {
            dialog.showMessageBox({
                type: 'error',
                title: 'Ошибка записи',
                message: `Ошибка записи в файл экспорта`,
                detail: err.toString()
            });
            return;
        }
    }
    interface_status(false);
    stoped = false;
    startDate = new Date();
    tick();
    document.querySelector('#progress > div').style.width = '0%';


    //Показ стоп
    el.innerText = 'Стоп';
    el.classList.remove('btn-dark');
    el.classList.add('btn-danger');

    //Показ паузы
    $('#actions').addClass('btn-group');
    $("#pause_btn").show();

    $("#progress > div").addClass('progress-bar-animated')

    while (next) {
        if(interrupted){
            interrupted = false;
            stoped = true;
            paused = false;
            $('#actions').removeClass('btn-group');
            $("#pause_btn").hide();
            $("#pause_icon").show();
            $("#play_icon").hide();
            el.innerText = 'Старт'
            el.classList.add('btn-dark')
            el.classList.remove('btn-danger');
            $("#progress > div").removeClass('progress-bar-animated')
            interface_status(true);

            //Exel
            if(export_file_ext == 'xlsx') {
                await exel_save();
            }
            export_file = undefined;
            break;
        }
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
                            numbers_parsed += ad.phone.split(',').length;
                            if (ad.account_parameters !== undefined) {
                                const name = ad.account_parameters.find((x) => x.p === 'name');
                                const phones = ad.phone.split(',').join(phones_delimiter);
                                const shop_guarantee = ad.account_parameters.find((x) => x.p === 'shop_guarantee');
                                const shop_address = ad.account_parameters.find((x) => x.p === 'shop_address');
                                const company_address = ad.account_parameters.find((x) => x.p === 'company_address');
                                const web_shop_link = ad.account_parameters.find((x) => x.p === 'web_shop_link');
                                const shop_manufacturer = ad.account_parameters.find((x) => x.p === 'shop_manufacturer');
                                const contact_person = ad.account_parameters.find((x) => x.p === 'contact_person');
                                if(name && phones) {
                                    /*data.add({
                                        name: name.v,
                                        phones: phones,
                                        shop_guarantee: shop_guarantee?.v || '',
                                        shop_address: shop_address?.v || '',
                                        company_address: company_address?.v || '',
                                        web_shop_link: web_shop_link?.v || '',
                                        shop_manufacturer: shop_manufacturer?.v || '',
                                        contact_person: contact_person?.v || '',
                                        ad_link: ad.ad_link
                                    });*/
                                    //Exel
                                    console.log(dublicate)
                                    if(ad.phone.split(',').length !== 1 && dublicate){
                                        for(const number of ad.phone.split(',')) {
                                            numbers_ads_parsed++;
                                            let fields_data = [
                                                capitalizeFirstLetter(name.v.trim()),
                                                number,
                                                shop_address?.v || '',
                                                company_address?.v || '',
                                                web_shop_link?.v || '',
                                                shop_manufacturer?.v || '',
                                                contact_person?.v || '',
                                                ad.ad_link
                                            ];

                                            if (export_file_ext == 'xlsx') {
                                                for (let index = 0; index != fields_data.length; index++){
                                                    ws.cell(numbers_ads_parsed + 1, index+1)
                                                        .string(fields_data[index])
                                                        .style(info);

                                                }
                                            } else if (export_file_ext == 'txt') {
                                                let data_string = '';
                                                for (let index = 0; index != fields_data.length; index++){
                                                    data_string += fields_data[index]+(index != fields_data.length-1 ? delimiter : "\r\n");
                                                }
                                                await ipcRenderer.invoke('fileAdd', {
                                                    file: export_file.filePath,
                                                    data: data_string
                                                });
                                            }
                                        }
                                    }   else{
                                        numbers_ads_parsed++;
                                        let fields_data = [
                                            capitalizeFirstLetter(name.v.trim()),
                                            phones,
                                            shop_address?.v || '',
                                            company_address?.v || '',
                                            web_shop_link?.v || '',
                                            shop_manufacturer?.v || '',
                                            contact_person?.v || '',
                                            ad.ad_link
                                        ];

                                        if (export_file_ext == 'xlsx') {
                                            for (let index = 0; index != fields_data.length; index++){
                                                ws.cell(numbers_ads_parsed + 1, index+1)
                                                    .string(fields_data[index])
                                                    .style(info);
                                            }
                                        } else if (export_file_ext == 'txt') {
                                            let data_string = '';
                                            for (let index = 0; index != fields_data.length; index++){
                                                data_string += fields_data[index]+(index != fields_data.length-1 ? delimiter : "\r\n");
                                            }
                                            await ipcRenderer.invoke('fileAdd', {
                                                file: export_file.filePath,
                                                data: data_string
                                            });
                                        }
                                    }
                                }
                                //if (ad.company_ad === false) {
                                //    if (name) {
                                //        console.log(capitalizeFirstLetter(name.v.trim()), phones)
                                //    }
                                //}
                            } else {
                                console.log(ad.account_parameters)
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
                    //Exel
                    if(export_file_ext == 'xlsx') {
                       await exel_save();
                    }
                    document.querySelector('#progress > div').style.width = '100%';
                    //setTimeout("document.querySelector('#progress > div').style.width = '100%';", 0)
                    console.log('end');
                    export_file = undefined;
                    interface_status(true);
                    $("#pause_btn").hide();
                    $("#pause_icon").show();
                    $("#play_icon").hide();
                    $('#actions').removeClass('btn-group');
                    //Показ стоп
                    el.innerText = 'Старт';
                    el.classList.remove('btn-danger');
                    el.classList.add('btn-dark');
                    $("#progress > div").removeClass('progress-bar-animated')
                }
                let self = json.pagination.pages.find(x => x.label == 'self');
                document.querySelector('#pages_getted').innerHTML = self.num;
                document.querySelector('#hiddened').innerHTML = hiddened_count;
                document.querySelector('#parsed').innerHTML = numbers_parsed;
                document.querySelector('#ads_parsed').innerHTML = ads_parsed;
                document.querySelector('#progress > div').style.width = (self.num * 100) / (json.total / ads_on_page) + '%';
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
    let filter = {},
        seller = document.querySelector('[name="seller"]:checked').value,
        condition = document.querySelector('[name="condition"]:checked').value,
        delivery = document.querySelector('[id="delivery"]').checked,
        installment = document.querySelector('[id="installment"]').checked,
        withphoto = document.querySelector('[id="withphoto"]').checked,
        maybetrade = document.querySelector('[id="maybetrade"]').checked,
        cat = document.querySelector('[id="categories"]').value,
        region = document.querySelector('[id="region"]').value,
        area = document.querySelector('[id="areas"]').value,
        ads_on_page = Number($("#ads_on_page").val());

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

    if (delivery) filter.dle = 1;
    if (installment) filter.hlv = 1;
    if (withphoto) filter.oph = 1;
    if (cat != 0) filter.prn = cat;
    if (maybetrade) filter.pse = 1;
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

    filter.size = ads_on_page;
    filter.sort = 'lst.d';
    filter.cur = 'BYN';
    filter.lang = 'ru';
    if (cursor) {
        filter.cursor = cursor;
    }

    return $.param(filter);
}

update_count();