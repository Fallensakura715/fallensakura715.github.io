function GithubCalendar(git_githubapiurl, git_color, git_user) {
  if (document.getElementById('github_container')) {
    var github_canlendar = (git_user, git_githubapiurl, git_color) => {
      var git_month = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
      var git_monthchange = [];
      var git_oneyearbeforeday = '';
      var git_thisday = '';
      var git_amonthago = '';
      var git_aweekago = '';
      var git_weekdatacore = 0;
      var git_datacore = 0;
      var git_total = 0;
      var git_git_data = [];
      var git_positionplusdata = [];
      var git_firstweek = [];
      var git_lastweek = [];
      var git_beforeweek = [];
      var git_thisweekdatacore = 0;
      var git_thisdayindex = 0;
      var git_firstdate = [];
      var git_first2date = [];
      var git_montharrbefore = [];
      var git_monthindex = 0;

      // Retina 适配：返回逻辑高度（CSS 像素），并设置物理尺寸
      var retinaCanvas = (canvas, context, ratio) => {
        var canvasWidth = document.getElementById("gitcalendarcanvasbox").offsetWidth;
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = (9 * 0.96 * canvasWidth / git_data.length) + 'px';
        canvas.width = canvasWidth * ratio;
        canvas.height = (9 * 0.96 * canvasWidth / git_data.length) * ratio;
        // 不在这里 scale，改用 setTransform 统一设置
        return canvas.height / ratio;
      };

      var responsiveChart = () => {
        if (document.getElementById("gitcanvas")) {
          var git_tooltip_container = document.getElementById('git_tooltip_container');
          var ratio = window.devicePixelRatio || 1;

          var github_calendar_c = document.getElementById("gitcanvas");
          var github_calendar_ctx = github_calendar_c.getContext("2d");

          // 复位矩阵、清空
          github_calendar_ctx.setTransform(1, 0, 0, 1, 0, 0);
          github_calendar_ctx.clearRect(0, 0, github_calendar_c.width, github_calendar_c.height);

          // 初始化尺寸
          var logicalHeight = retinaCanvas(github_calendar_c, github_calendar_ctx, ratio);
          var logicalWidth = document.getElementById("gitcalendarcanvasbox").offsetWidth;

          // 统一使用 setTransform 应用缩放，避免多次 scale 叠加
          github_calendar_ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

          git_positionplusdata = [];

          // 逻辑像素尺寸
          var linemaxwitdh = logicalHeight / 9;
          var lineminwitdh = 0.8 * linemaxwitdh;
          var setposition = {
            x: 0.02 * logicalWidth,
            y: 0.025 * logicalWidth
          };

          for (var week in git_data) {
            weekdata = git_data[week];
            for (var day in weekdata) {
              var dataitem = { date: "", count: "", x: 0, y: 0 };

              github_calendar_ctx.fillStyle = git_thiscolor(git_color, weekdata[day].count);
              setposition.y = Math.round(setposition.y * 100) / 100;

              dataitem.date = weekdata[day].date;
              dataitem.count = weekdata[day].count;
              dataitem.x = setposition.x;
              dataitem.y = setposition.y;
              git_positionplusdata.push(dataitem);

              github_calendar_ctx.fillRect(setposition.x, setposition.y, lineminwitdh, lineminwitdh);
              setposition.y = setposition.y + linemaxwitdh;
            }
            setposition.y = 0.025 * logicalWidth;
            setposition.x = setposition.x + linemaxwitdh;
          }

          if (document.body.clientWidth > 700) {
            github_calendar_ctx.font = "600 10px Arial";
            github_calendar_ctx.fillStyle = '#aaa';
            github_calendar_ctx.fillText("日", 0, 1.9 * linemaxwitdh);
            github_calendar_ctx.fillText("二", 0, 3.9 * linemaxwitdh);
            github_calendar_ctx.fillText("四", 0, 5.9 * linemaxwitdh);
            github_calendar_ctx.fillText("六", 0, 7.9 * linemaxwitdh);

            var monthindexlist = logicalWidth / 24;
            for (var index in git_monthchange) {
              github_calendar_ctx.fillText(git_monthchange[index], monthindexlist, 0.7 * linemaxwitdh);
              monthindexlist = monthindexlist + logicalWidth / 12;
            }
          }

          github_calendar_c.onmousemove = function (event) {
            if (document.querySelector('.gitmessage')) {
              git_tooltip_container.innerHTML = "";
            }
            getMousePos(github_calendar_c, event, lineminwitdh);
          };

          git_tooltip_container.onmousemove = function () {
            if (document.querySelector('.gitmessage')) {
              git_tooltip_container.innerHTML = "";
            }
          };

          // 鼠标命中：用物理像素与 CSS 像素比例换算，再除以 ratio 回到逻辑坐标
          var getMousePos = (canvas, event, boxSize) => {
            var rect = canvas.getBoundingClientRect();
            var scaleX = canvas.width / rect.width;
            var scaleY = canvas.height / rect.height;
            var ratio = window.devicePixelRatio || 1;

            var x = (event.clientX - rect.left) * scaleX / ratio;
            var y = (event.clientY - rect.top) * scaleY / ratio;

            for (var item of git_positionplusdata) {
              var lenthx = x - item.x;
              var lenthy = y - item.y;
              if (0 <= lenthx && lenthx <= boxSize && 0 <= lenthy && lenthy <= boxSize) {
                git_span1 = item.date;
                git_span2 = item.count;

                git_x = event.clientX - 100;
                git_y = event.clientY - 60;

                html = tooltip_html(git_x, git_y, git_span1, git_span2);
                append_div_gitcalendar(git_tooltip_container, html);
                break;
              }
            }
          };
        }
      };

      var addlastmonth = () => {
        if (git_thisdayindex === 0) {
          thisweekcore(52); thisweekcore(51); thisweekcore(50); thisweekcore(49); thisweekcore(48);
          git_thisweekdatacore += git_firstdate[6].count;
          git_amonthago = git_firstdate[6].date;
        } else {
          thisweekcore(52); thisweekcore(51); thisweekcore(50); thisweekcore(49); thisweek2core();
          git_amonthago = git_first2date[git_thisdayindex - 1].date;
        }
      };
      var thisweek2core = () => { for (var i = git_thisdayindex - 1; i < git_first2date.length; i++) { git_thisweekdatacore += git_first2date[i].count; } };
      var thisweekcore = (index) => { for (var item of git_data[index]) { git_thisweekdatacore += item.count; } };
      var addlastweek = () => { for (var item of git_lastweek) { git_weekdatacore += item.count; } };
      var addbeforeweek = () => { for (var i = git_thisdayindex; i < git_beforeweek.length; i++) { git_weekdatacore += git_beforeweek[i].count; } };
      var addweek = (data) => {
        if (git_thisdayindex === 6) {
          git_aweekago = git_lastweek[0].date;
          addlastweek();
        } else {
          lastweek = data.contributions[51];
          git_aweekago = lastweek[git_thisdayindex + 1].date;
          addlastweek();
          addbeforeweek();
        }
      };

      fetch(git_githubapiurl).then(data => data.json()).then(data => {
        if (document.getElementById('github_loading')) {
          document.getElementById('github_loading').remove();
        }
        git_data = data.contributions;
        git_total = data.total;
        git_first2date = git_data[48];
        git_firstdate = git_data[47];
        git_firstweek = data.contributions[0];
        git_lastweek = data.contributions[52];
        git_beforeweek = data.contributions[51];
        git_thisdayindex = git_lastweek.length - 1;
        git_thisday = git_lastweek[git_thisdayindex].date;
        git_oneyearbeforeday = git_firstweek[0].date;
        git_monthindex = git_thisday.substring(5, 7) * 1;
        git_montharrbefore = git_month.splice(git_monthindex, 12 - git_monthindex);
        git_monthchange = git_montharrbefore.concat(git_month);
        addweek(data);
        addlastmonth();
        var html = github_main_box(git_monthchange, git_data, git_user, git_color, git_total, git_thisweekdatacore, git_weekdatacore, git_oneyearbeforeday, git_thisday, git_aweekago, git_amonthago);
        append_div_gitcalendar(github_container, html);
        setTimeout(responsiveChart, 0);
      }).catch(function (error) {
        console.log(error);
      });

      window.onresize = function () {
        responsiveChart();
      };
      window.onscroll = function () {
        if (document.querySelector('.gitmessage')) {
          git_tooltip_container.innerHTML = "";
        }
      };

      var git_thiscolor = (color, x) => {
        if (x === 0) { var i = parseInt(x / 2); return color[0]; } else if (x < 2) { return color[1]; } else if (x < 20) { var i = parseInt(x / 2); return color[i]; } else { return color[9]; }
      };
      var tooltip_html = (x, y, span1, span2) => {
        var html = '';
        html += '<div class="gitmessage" style="top:' + y + 'px;left:' + x + 'px;position: fixed;z-index:9999"><div class="angle-wrapper" style="display:block;"><span>' + span1 + '&nbsp;</span><span>' + span2 + ' 次上传</span></div></div>';
        return html;
      };
      var github_canvas_box = () => {
        var html = '<div id="gitcalendarcanvasbox"> <canvas id="gitcanvas" style="animation: none;"></canvas></div>';
        return html;
      };
      var github_info_box = (user, color) => {
        var html = '';
        html += '<div id="git_tooltip_container"></div><div class="contrib-footer clearfix mt-1 mx-3 px-3 pb-1"><div class="float-left text-gray">数据来源 <a href="https://github.com/' + user + '" target="blank">@' + user + '</a></div><div class="contrib-legend text-gray">Less <ul class="legend"><li style="background-color:' + color[0] + '"></li><li style="background-color:' + color[2] + '"></li><li style="background-color:' + color[4] + '"></li><li style="background-color:' + color[6] + '"></li><li style="background-color:' + color[8] + '"></li></ul>More </div></div>';
        return html;
      };
      var github_main_box = (monthchange, git_data, user, color, total, thisweekdatacore, weekdatacore, oneyearbeforeday, thisday, aweekago, amonthago) => {
        var html = '';
        var canvasbox = github_canvas_box();
        var infobox = github_info_box(user, color);
        var style = github_main_style();
        html += '<div class="position-relative"><div class="border py-2 graph-before-activity-overview"><div class="js-gitcalendar-graph mx-md-2 mx-3 d-flex flex-column flex-items-end flex-xl-items-center overflow-hidden pt-1 is-graph-loading graph-canvas gitcalendar-graph height-full text-center">' + canvasbox + '</div>' + infobox + '</div></div>';
        html += '<div style="display:flex;width:100%"><div class="contrib-column contrib-column-first table-column"><span class="text-muted">过去一年提交</span><span class="contrib-number">' + total + '</span><span class="text-muted">' + oneyearbeforeday + '&nbsp;-&nbsp;' + thisday + '</span></div><div class="contrib-column table-column"><span class="text-muted">最近一月提交</span><span class="contrib-number">' + thisweekdatacore + '</span><span class="text-muted">' + amonthago + '&nbsp;-&nbsp;' + thisday + '</span></div><div class="contrib-column table-column"><span class="text-muted">最近一周提交</span><span class="contrib-number">' + weekdatacore + '</span><span class="text-muted">' + aweekago + '&nbsp;-&nbsp;' + thisday + '</span></div></div>' + style;
        return html;
      };
      var github_main_style = () => {
        style = '<style>#github_container{text-align:center;margin:0 auto;width:100%;display:flex;display:-webkit-flex;justify-content:center;align-items:center;flex-wrap:wrap;}.gitcalendar-graph text.wday,.gitcalendar-graph text.month{font-size:10px;fill:#aaa;}.contrib-legend{text-align:right;padding:0 14px 10px 0;display:inline-block;float:right;}.contrib-legend .legend{display:inline-block;list-style:none;margin:0 5px;position:relative;bottom:-1px;padding:0;}.contrib-legend .legend li{display:inline-block;width:10px;height:10px;}.text-small{font-size:12px;color:#767676;}.gitcalendar-graph{padding:15px 0 0;text-align:center;}.contrib-column{text-align:center;border-left:1px solid #ddd;border-top:1px solid #ddd;font-size:11px;}.contrib-column-first{border-left:0;}.table-column{padding:10px;display:table-cell;flex:1;vertical-align:top;}.contrib-number{font-weight:300;line-height:1.3em;font-size:24px;display:block;}.gitcalendar img.spinner{width:70px;margin-top:50px;min-height:70px;}.monospace{text-align:center;color:#000;font-family:monospace;}.monospace a{color:#1D75AB;text-decoration:none;}.contrib-footer{font-size:11px;padding:0 10px 12px;text-align:left;width:100%;box-sizing:border-box;height:26px;}.left.text-muted{float:left;margin-left:9px;color:#767676;}.left.text-muted a{color:#4078c0;text-decoration:none;}.left.text-muted a:hover,.monospace a:hover{text-decoration:underline;}h2.f4.text-normal.mb-3{display:none;}.float-left.text-gray{float:left;}#user-activity-overview{display:none;}.day-tooltip{white-space:nowrap;position:absolute;z-index:99999;padding:10px;font-size:12px;color:#959da5;text-align:center;background:rgba(0,0,0,.85);border-radius:3px;display:none;pointer-events:none;}.day-tooltip strong{color:#dfe2e5;}.day-tooltip.is-visible{display:block;}.day-tooltip:after{position:absolute;bottom:-10px;left:50%;width:5px;height:5px;box-sizing:border-box;margin:0 0 0 -5px;content:" ";border:5px solid transparent;border-top-color:rgba(0,0,0,.85)}.position-relative{width:100%;}@media screen and (max-width:650px){.contrib-column{display:none}}.angle-wrapper{z-index:9999;display:inline;width:200px;height:40px;position:relative;padding:5px 0;background:rgba(0,0,0,0.8);border-radius:8px;text-align:center;color:white;}.angle-box{position:fixed;padding:10px}.angle-wrapper span{padding-bottom:1em;}.angle-wrapper:before{content:"";width:0;height:0;border:10px solid transparent;border-top-color:rgba(0,0,0,0.8);position:absolute;left:47.5%;top:100%;}</style>';
        return style;
      };
    };
    var append_div_gitcalendar = (parent, text) => {
      if (typeof text === 'string') {
        var temp = document.createElement('div');
        temp.innerHTML = text;
        var frag = document.createDocumentFragment();
        while (temp.firstChild) { frag.appendChild(temp.firstChild); }
        parent.appendChild(frag);
      } else {
        parent.appendChild(text);
      }
    };
    var github_container = document.getElementById('github_container');
    var github_loading = document.getElementById('github_loading');
    github_canlendar(git_user, git_githubapiurl, git_color);
  }
}