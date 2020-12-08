// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { ipcRenderer } = require('electron');

ipcRenderer.invoke('getRegions').then((result) => {
  window.categories = result.props.initialState.filters.filtersData.metadata.parameters.refs[902].values;
  window.regions = Object.entries(result.props.initialState.location.regions).sort((a, b) => {
    return a['order'] > b['order'] ? 1 : -1;
  });

  var categories_el = document.getElementById('categories');
  var opt = document.createElement('option');
  opt.innerHTML = 'Любая';
  categories_el.innerHTML = '';
  categories_el.appendChild(opt);
  opt.value = '0';
  for(let i = 1; i < window.categories.length; i++) {
    var opt = document.createElement('option');
    opt.innerHTML = window.categories[i]['labels']['ru'];
    opt.value = window.categories[i].value;
    categories_el.appendChild(opt);
  }

  //localStorage.setItem('regions', regions);
  var region_el = document.getElementById('region');
  var opt = document.createElement('option');
  opt.innerHTML = 'Вся Беларусь';
  opt.value = '0';
  region_el.appendChild(opt);
  for(let i = 1; i < window.regions.length; i++) {
    var opt = document.createElement('option');
    opt.innerHTML = window.regions[i][1]['labels']['ru'];
    opt.value = window.regions[i][0];
    console.log(window.regions[i][0]);
    region_el.appendChild(opt);
  }
});