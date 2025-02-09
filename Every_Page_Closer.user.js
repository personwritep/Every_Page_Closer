// ==UserScript==
// @name        Every Page Closer 💢
// @namespace        http://tampermonkey.net/
// @version        3.0
// @description        「記事の編集・削除」ページで全記事を「下書き」に変更する
// @author        Ameba Blog User
// @match        https://blog.ameba.jp/ucs/entry/srventrylist*
// @match        https://blog.ameba.jp/ucs/entry/srventryupdate*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=ameba.jp
// @run-at        document-start
// @grant        none
// @updateURL        https://github.com/personwritep/Every_Page_Closer/raw/main/Every_Page_Closer.user.js
// @downloadURL        https://github.com/personwritep/Every_Page_Closer/raw/main/Every_Page_Closer.user.js
// ==/UserScript==


let retry=0;
let interval=setInterval(wait_target, 1);
function wait_target(){
    retry++;
    if(retry>100){ // リトライ制限 100回 0.1secまで
        clearInterval(interval); }
    let target=document.documentElement; // 監視 target
    if(target){
        clearInterval(interval);
        style_in(); }}

function style_in(){
    let style=
        '<style id="EPC">'+
        '#globalHeader, #ucsHeader, #ucsMainLeft h1, #ucsMainRight, .l-ucs-sidemenu-area, '+
        '.selection-bar { display: none !important; } '+

        '#ucsContent { width: 930px !important; } '+
        '#ucsContent::before { display: none; } '+
        '#ucsMain { background: none; } '+
        '#ucsMainLeft { width: 930px !important; padding: 0 15px !important; } '+

        '#entryMonth li a:visited { color: #3970B5 !important; }'+
        '#nowMonth { color: #000; } '+
        '#entryListEdit form { display: flex; flex-direction: column; } '+
        '#entrySort { order: -2; margin-bottom: 2px; } '+
        '#sorting { font-size: 15px; margin: 36px 0 4px; padding: 2px 0; height: 40px; } '+
        '#sorting select, #sorting ul { display: none; } '+
        '.pagingArea { order: -1; '+
        'margin-bottom: -33px; position:unset !important; background: #ddedf3; } '+
        '.pagingArea a { border: 1px solid #888; } '+
        '.pagingArea .active{ border: 2px solid #0066cc; } '+
        '.pagingArea a, .pagingArea .active, .pagingArea .disabled { '+
        'font-size: 14px; line-height: 23px; } '+

        '#sorting input { font-family: meiryo; font-size: 15px }'+
        '.entry-item .checkbox-column { display: block; } '+
        '#start_button { padding: 2px 8px 0; margin: 6px 15px; width: 200px } '+
        '#all_button {padding: 2px 8px 0; margin: 6px 0 6px 120px; width: 145px } '+
        '#am_button {padding: 2px 8px 0; margin: 6px 15px; width: 270px; float: right } '+
        '</style>';

    if(!document.querySelector('#EPO')){
        document.documentElement.insertAdjacentHTML('beforeend', style); }

} // style_in()




window.addEventListener('load', function(){
    let auto_check; // チェック自動記入のフラグ
    let amember; // アメンバー処理の有無のフラグ

    auto_check=localStorage.getItem('blogDB_mode_check'); // ローカルストレージ
    if(!auto_check){
        auto_check=0; }
    localStorage.setItem('blogDB_mode_check', auto_check); // ローカルストレージ保存

    amember=localStorage.getItem('blogDB_mode_am'); // ローカルストレージ
    if(!amember){
        amember=0; }
    localStorage.setItem('blogDB_mode_am', amember); // ローカルストレージ保存


    let mode_arr=[]; // mode_arr[0]自動リロードのフラグ、mode_arr[1]初回処理のフラグ

    let read_json=sessionStorage.getItem('blogDB_mode'); // セッションストレージ 保存
    mode_arr=JSON.parse(read_json);
    if(!mode_arr || mode_arr.length!=3){
        mode_arr=[0, 0, 0]; }


    if(mode_arr[0]==1){ // 変更処理後の自動ロード後の場合
        mode_arr[0]=0; // リセット
        let write_json=JSON.stringify(mode_arr);
        sessionStorage.setItem('blogDB_mode', write_json); //  // セッションストレージ保存
        setTimeout(()=>{
            location.reload(false); }, 2000 ); }// ツールから再リロードする
    else{
        main(mode_arr, auto_check, amember); }

})




function main(mode_arr, auto_check, amember){

    check();

    function check(){
        let spui=document.querySelectorAll('.spui-Checkbox-input');
        for(let k=1; k<spui.length; k++){
            set_check(spui[k]); }

        function set_check(sp){
            if(auto_check==0){
                let publish=sp.getAttribute('data-entry-publish');
                if(publish=='0' || publish=='1'){
                    sp.checked=true; }
                else if(publish=='2'){
                    if(amember==0){
                        sp.checked=true; }
                    else{
                        sp.checked=false; }}}
            else{
                sp.checked=false; }}

    } // check()



    let panel=
        '<input id="start_button" type="submit" value="▼ クローズ処理を実行">'+
        '<input id="all_button" type="submit">'+
        '<input id="am_button" type="submit">';

    if(document.querySelector('#sorting') && !document.querySelector('#start_button')){
        document.querySelector('#sorting').insertAdjacentHTML('beforeend', panel); }



    let button1=document.querySelector('#start_button');
    button1.onclick=function(e){
        e.preventDefault();
        if(mode_arr[1]==0){ // 最初の起動直後の場合
            start_select(); }
        else{
            open_win(); }} // 作業実行



    function start_select(){
        let entry_target=document.querySelectorAll('.entry-item .entry');
        if(entry_target.length==0 || entry_target==null){ // 編集対象がリストに無い場合
            alert('このページに編集対象の記事がありません'); }
        if(entry_target.length >0){ // 編集対象がリストに有る場合
            let conf_str=['⛔　 このページで 「下書き」への一括変更処理を実行します。\n',
                          '\n　　 Every Page Closer 💢 の実行前に Every Page Snap 💢',
                          '\n　　 を実行して、全ての記事の 「公開設定」 を記録してください。',
                          '\n　　 「公開設定」 のSNAP記録が無いと 「アメンバー限定公開」 と',
                          '\n　　 「全員に公開」 の区別がなくなり 公開処理が困難になります。\n',
                          '\n　　　　　　OK を押すと 「クローズ処理」 を開始します。'].join('');
            let ok=confirm(conf_str);
            if(ok){
                open_win(); }}}



    let button2=document.querySelector('#all_button');
    if(auto_check==0){
        button2.value='✅  全件チェック'; }
    else{
        button2.value='⬜  全件チェック'; }

    button2.onclick=function(e){
        e.preventDefault();
        if(auto_check==0){
            auto_check=1;
            button2.value='⬜  全件チェック'; }
        else{
            auto_check=0;
            button2.value='✅  全件チェック'; }
        localStorage.setItem('blogDB_mode_check', auto_check); // ローカルストレージ保存

        check(); }



    let button3=document.querySelector('#am_button');
    if(amember==0){
        button3.value='🔽  アメンバー記事もクローズする'; }
    else if(amember==1){
        button3.value='⬜  アメンバー記事は処理をしない'; }

    button3.onclick=function(e){
        e.preventDefault();
        if(amember==0){
            amember=1;
            button3.value='⬜  アメンバー記事は処理をしない'; }
        else if(amember==1){
            amember=0;
            button3.value='🔽  アメンバー記事もクローズする'; }
        localStorage.setItem('blogDB_mode_am', amember); // ローカルストレージ保存

        check(); }



    function open_win(){
        let convert=document.querySelector('#js-convert-to-draft-button-convert');
        if(convert){
            mode_arr[0]=1; // 書換処理を実行
            mode_arr[1]=1; // 初回の実行以降
            let write_json=JSON.stringify(mode_arr);
            sessionStorage.setItem('blogDB_mode', write_json); // セッションストレージ 保存

            convert.click(); }}

} // main()
