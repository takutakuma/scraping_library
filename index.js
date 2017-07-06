'use strict';

const Nightmare = require('nightmare');
const fs = require('fs');
require('date-utils');
// const jsondiffpatch = require('jsondiffpatch');

const newBookURL = 'https://www.library.pref.osaka.jp/licsxp-opac/WOpacMsgNewMenuToMsgNewListAction.do?newMenuCode=';
const searchItems = {
        category:[
            {
                genre : '04',
                ndc :'007',
            },
            {
                genre : '12',
                ndc :'417',
            },
            {
                genre : '14',
                ndc :'547',
            },
            {
                genre : '14',
                ndc :'548',
            },
        ]
    } //04:総記,007:情報関連,14:技術工学,547

//category配列分処理

console.log(searchItems['category'].map(function(x){return x.genre + ':' + x.ndc;}));

const nightmare = new Nightmare({ show: false });

const getBookData =  async (genre,ndc) => {
    const nightmare = new Nightmare({ show: false });

    try {
        const result = await nightmare
        .goto(newBookURL + genre)
        .wait('table.list tr.ItemNo')
        .evaluate((ndc) => {
            let table = document.querySelectorAll('table.list tr.ItemNo');
            let booksInfo = Array.from(table).filter(ele =>
                ele.cells['ItemDeta001f'].innerText.substr(0,3) === ndc);

            return booksInfo.map(ele =>
                [{id : ele.querySelectorAll('td')[1].querySelector('td a').getAttribute('href').replace(/[^0-9]+/g,""),
                name : ele.querySelectorAll('td')[1].innerText,
                author : ele.querySelectorAll('td')[3].innerText,
                ndc : ele.querySelectorAll('td')[6].innerText,
                }]);
        },ndc)
        .end()

        return result;
    } catch(e) {
        console.error('Search failed:', e);
        return undefined;
    }
};


const series = searchItems['category'].reduce(async (queue,x) => {
    const bookArray = await queue;
    bookArray.push(await getBookData(x.genre,x.ndc));
    return bookArray;
}, Promise.resolve([]));

series.then(data => {

    //取得データの整形
    let jsonData =[];
    data.forEach(function(value,key){
        value.forEach(function(value2,key2){
            jsonData.push(value2);
        });
    });

    let dt = new Date();
    let formatted = dt.toFormat("YYYYMMDD");
    fs.writeFile(`${formatted}.json`, JSON.stringify(jsonData,null, '\t') ,'utf8');

    //jsonファイルの比較(前日データとの比較)
    // const a = require(`./${formatted}.json`);
    // dt.add({days : -1});    //前日に設定仕直し
    // const b = require(`./${dt.toFormat("YYYYMMDD")}.json`);

    // const diff = jsondiffpatch.diff(a, b);

    // console.log(diff);
})
.catch(e => console.error(e));
