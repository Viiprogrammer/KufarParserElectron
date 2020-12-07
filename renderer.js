// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
const { ipcRenderer } = require('electron');
var xl = require('excel4node');

update_count();
function loadAreas(val){
    var areas_el = document.getElementById('areas');
    var opt = document.createElement('option');
    opt.innerHTML = 'Все';
    areas_el.innerHTML = '';
    areas_el.appendChild(opt);
    opt.value = '0';
    if(val == 0) {
        areas_el.disabled = true;
        return false;
    } else {
        areas_el.disabled = false;
    }
    let selected = regions.find((x) => x[0] === val);

    let areas = Object.entries(selected[1]['areas']).sort((a, b) => {
        return a[1]['order'] > b[1]['order'] ? 1 : -1;
    });

    var areas_el = document.getElementById('areas');
    for(let i = 1; i < areas.length; i++) {
        var opt = document.createElement('option');
        opt.innerHTML = areas[i][1]['labels']['ru'];
        opt.value = areas[i][0];
        //console.log(areas[i][0]);
        areas_el.appendChild(opt);
    }
}
function update_count(){
    let q = query();
    ipcRenderer.invoke('getCount', query()).then((result) => {
        document.querySelector('#ads_count').innerHTML = result.count;
        console.log(q, result.count)
    });
}
async function start(el){
    var wb = new xl.Workbook();
    var ws = wb.addWorksheet('Sheet 1');
    el.disabled = true
    let progress = 0;
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
    while(next){
        response = await fetch('https://cre-api.kufar.by/items-search/v1/engine/v1/search/rendered-paginated?'+query(cursor));
        json = await response.json();
        next = json.pagination.pages.find(x => x.label == 'next');
        cursor = next.token;
        let self = json.pagination.pages.find(x => x.label == 'self');
        document.querySelector('#pages_getted').innerHTML = self.num;
    }
    document.querySelector('#progress > div').style.width = progress+'%';

}
function query(cursor = false){
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

    if(seller == 1){
        filter.cmp = 0;
    } else if (seller == 2){
        filter.cmp = 1;
    }

    if(condition == 1){
        filter.cnd = 2;
    } else if (condition == 2){
        filter.cnd = 1;
    }

    if(delivery){
        filter.dle = 1;
    }

    if(installment){
        filter.hlv = 1;
    }

    if(withphoto){
        filter.oph = 1;
    }

    if(cat != 0){
        filter.prn = cat;
    }

    if(maybetrade){
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
    if(region != 0){
        filter.rgn = region;
    }

    if(area != 0){
        filter.ar = area;
    }


    filter.size = 42;
    filter.sort = 'lst.d';
    filter.cur = 'BYN';
    filter.lang = 'ru';
    if(cursor){
        filter.cursor = cursor;
    }

    return $.param(filter);;
}
console.log(query(false));