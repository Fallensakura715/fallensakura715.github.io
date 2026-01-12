function GithubCalendar(git_githubapiurl, git_color, git_user) {
  if (document.getElementById('github_container')) {
    var github_canlendar = (git_user, git_githubapiurl, git_color) => {
      var git_month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      var git_monthchange = [];
      var git_oneyearbeforeday = '';
      var git_thisday = '';
      var git_amonthago = '';
      var git_aweekago = '';
      var git_weekdatacore = 0;
      var git_total = 0;
      var git_positionplusdata = [];
      var git_firstweek = [];
      var git_lastweek = [];
      var git_beforeweek = [];
      var git_thisweekdatacore = 0;
      var git_thisdayindex = 0;
      var git_firstdate = [];
      var git_first2date = [];
      var git_monthindex = 0;
      var git_data = [];

      var responsiveChart = () => {
        if (document.getElementById("gitcanvas") && git_data.length > 0) {
          var git_tooltip_container = document.getElementById('git_tooltip_container');
          var ratio = window.devicePixelRatio || 1;
          var github_calendar_c = document.getElementById("gitcanvas");
          var github_calendar_ctx = github_calendar_c.getContext("2d");

          var container = document.getElementById("gitcalendarcanvasbox");
          var containerWidth = container.offsetWidth;
          var minRequiredWidth = 750;
          var actualWidth = Math.max(containerWidth, minRequiredWidth);

          var totalWeeks = git_data.length;
          var startX = 35;
          var startY = 20;
          var boxGap = 3;

          var availableWidth = actualWidth - startX - 20;
          var boxSize = Math.floor((availableWidth - (totalWeeks - 1) * boxGap) / totalWeeks);
          if (boxSize < 10) boxSize = 10;
          if (boxSize > 14) boxSize = 14;

          var step = boxSize + boxGap;

          var requiredWidth = startX + totalWeeks * step;
          var canvasHeight = step * 7 + startY + 20;

          github_calendar_c.style.width = requiredWidth + 'px';
          github_calendar_c.style.height = canvasHeight + 'px';

          github_calendar_c.style.display = "block";
          github_calendar_c.style.margin = "0 auto"; ``

          github_calendar_c.width = requiredWidth * ratio;
          github_calendar_c.height = canvasHeight * ratio;

          github_calendar_ctx.setTransform(1, 0, 0, 1, 0, 0);
          github_calendar_ctx.clearRect(0, 0, github_calendar_c.width, github_calendar_c.height);
          github_calendar_ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

          git_positionplusdata = [];
          var itemRadius = 2;

          var drawRoundedRect = (ctx, x, y, width, height, radius, fillColor, strokeColor) => {
            var fillX = Math.floor(x);
            var fillY = Math.floor(y);
            var fillW = Math.floor(width);
            var fillH = Math.floor(height);

            ctx.beginPath();
            ctx.moveTo(fillX + radius, fillY);
            ctx.arcTo(fillX + fillW, fillY, fillX + fillW, fillY + fillH, radius);
            ctx.arcTo(fillX + fillW, fillY + fillH, fillX, fillY + fillH, radius);
            ctx.arcTo(fillX, fillY + fillH, fillX, fillY, radius);
            ctx.arcTo(fillX, fillY, fillX + fillW, fillY, radius);
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.fill();

            if (strokeColor) {
              var lineWidth = 0.5;
              var offset = lineWidth / 2;

              var strokeX = fillX + offset;
              var strokeY = fillY + offset;
              var strokeW = fillW - lineWidth;
              var strokeH = fillH - lineWidth;

              ctx.beginPath();
              ctx.moveTo(strokeX + radius, strokeY);
              ctx.arcTo(strokeX + strokeW, strokeY, strokeX + strokeW, strokeY + strokeH, radius);
              ctx.arcTo(strokeX + strokeW, strokeY + strokeH, strokeX, strokeY + strokeH, radius);
              ctx.arcTo(strokeX, strokeY + strokeH, strokeX, strokeY, radius);
              ctx.arcTo(strokeX, strokeY, strokeX + strokeW, strokeY, radius);
              ctx.closePath();

              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = lineWidth;
              ctx.stroke();
            }
          };

          var monthPositions = [];
          var prevMonth = null;

          for (var w = 0; w < git_data.length; w++) {
            var weekdata = git_data[w];
            var currentX = startX + w * step;
            for (var d = 0; d < weekdata.length; d++) {
              var dayData = weekdata[d];
              var currentY = startY + d * step;
              var dataitem = {
                date: dayData.date,
                count: dayData.count,
                x: currentX,
                y: currentY
              };
              git_positionplusdata.push(dataitem);
              var color = git_thiscolor(git_color, dayData.count);
              var strokeColor = 'rgba(31, 35, 40, 0.08)';

              drawRoundedRect(github_calendar_ctx, currentX, currentY, boxSize, boxSize, itemRadius, color, strokeColor);

              var dateObj = new Date(dayData.date);
              var m = dateObj.getMonth();
              if (prevMonth === null || m !== prevMonth) {
                if (d === 0) {
                  monthPositions.push({ label: git_month[m], x: currentX });
                  prevMonth = m;
                }
              }
            }
          }

          github_calendar_ctx.font = "500 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
          github_calendar_ctx.fillStyle = '#404040ff';
          github_calendar_ctx.textAlign = 'left';
          github_calendar_ctx.fillText("Sun", 5, startY + 0 * step + boxSize * 0.7);
          github_calendar_ctx.fillText("Tue", 5, startY + 2 * step + boxSize * 0.7);
          github_calendar_ctx.fillText("Thu", 5, startY + 4 * step + boxSize * 0.7);
          github_calendar_ctx.fillText("Sat", 5, startY + 6 * step + boxSize * 0.7);

          for (var i = 0; i < monthPositions.length; i++) {
            github_calendar_ctx.fillText(monthPositions[i].label, monthPositions[i].x, startY - 7);
          }

          github_calendar_c.onmousemove = function (event) {
            if (document.querySelector('.gitmessage')) {
              git_tooltip_container.innerHTML = "";
            }
            getMousePos(github_calendar_c, event, boxSize);
          };

          git_tooltip_container.onmousemove = function () {
            if (document.querySelector('.gitmessage')) {
              git_tooltip_container.innerHTML = "";
            }
          };

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
                var git_span1 = item.date;
                var git_span2 = item.count;
                var git_x = event.clientX - 100;
                var git_y = event.clientY - 45;
                var html = tooltip_html(git_x, git_y, git_span1, git_span2);
                append_div_gitcalendar(git_tooltip_container, html);
                break;
              }
            }
          };
        }
      };

      var addlastmonth = () => {
        var len = git_data.length;
        if (git_thisdayindex === 0) {
          for (var i = 1; i <= 5; i++) {
            if (len - i >= 0) thisweekcore(len - i);
          }
          if (git_firstdate && git_firstdate[6]) {
            git_amonthago = git_firstdate[6].date;
          }
        } else {
          for (var i = 1; i <= 4; i++) {
            if (len - i >= 0) thisweekcore(len - i);
          }
          thisweek2core();
          if (git_first2date && git_first2date[git_thisdayindex - 1]) {
            git_amonthago = git_first2date[git_thisdayindex - 1].date;
          }
        }
      };

      var thisweek2core = () => {
        if (git_first2date) {
          for (var i = git_thisdayindex - 1; i < git_first2date.length; i++) {
            git_thisweekdatacore += git_first2date[i].count;
          }
        }
      };

      var thisweekcore = (index) => {
        if (git_data[index]) {
          for (var item of git_data[index]) {
            git_thisweekdatacore += item.count;
          }
        }
      };

      var addlastweek = () => {
        for (var item of git_lastweek) {
          git_weekdatacore += item.count;
        }
      };

      var addbeforeweek = () => {
        if (git_beforeweek) {
          for (var i = git_thisdayindex; i < git_beforeweek.length; i++) {
            git_weekdatacore += git_beforeweek[i].count;
          }
        }
      };

      var addweek = (data) => {
        var len = data.contributions.length;
        if (git_thisdayindex === 6) {
          if (git_lastweek[0]) git_aweekago = git_lastweek[0].date;
          addlastweek();
        } else {
          if (len >= 2) {
            var lastweek = data.contributions[len - 2];
            if (lastweek[git_thisdayindex + 1]) git_aweekago = lastweek[git_thisdayindex + 1].date;
          }
          addlastweek();
          addbeforeweek();
        }
      };

      fetch(git_githubapiurl).then(data => data.json()).then(data => {
        if (document.getElementById('github_loading')) {
          document.getElementById('github_loading').remove();
        }
        git_data = data.contributions;
        var len = git_data.length;
        git_total = data.total;
        git_first2date = len >= 5 ? git_data[len - 5] : null;
        git_firstdate = len >= 6 ? git_data[len - 6] : null;
        git_firstweek = git_data[0];
        git_lastweek = git_data[len - 1];
        git_beforeweek = len >= 2 ? git_data[len - 2] : null;
        git_thisdayindex = git_lastweek.length - 1;
        git_thisday = git_lastweek[git_thisdayindex].date;
        git_oneyearbeforeday = git_firstweek[0].date;
        git_monthindex = git_thisday.substring(5, 7) * 1;
        git_monthchange = git_month.slice(git_monthindex).concat(git_month.slice(0, git_monthindex));
        addweek(data);
        addlastmonth();
        var html = github_main_box(git_monthchange, git_data, git_user, git_color, git_total, git_thisweekdatacore, git_weekdatacore, git_oneyearbeforeday, git_thisday, git_aweekago, git_amonthago);
        append_div_gitcalendar(github_container, html);
        setTimeout(responsiveChart, 50);
      }).catch(function (error) {
        console.log(error);
      });

      window.onresize = function () {
        responsiveChart();
      };

      window.onscroll = function () {
        var git_tooltip_container = document.getElementById('git_tooltip_container');
        if (git_tooltip_container && document.querySelector('.gitmessage')) {
          git_tooltip_container.innerHTML = "";
        }
      };

      var git_thiscolor = (color, count) => {
        if (count === 0) return color[0];
        else if (count >= 1 && count <= 3) return color[1];
        else if (count >= 4 && count <= 6) return color[2];
        else if (count >= 7 && count <= 9) return color[3];
        else return color[4]; // count >= 10
      };

      var formatDateOrdinal = (dateStr) => {
        var d = new Date(dateStr);
        var day = d.getDate();
        var month = d.toLocaleString('en-US', { month: 'long' });
        var suffix = 'th';
        if (day % 10 === 1 && day !== 11) suffix = 'st';
        else if (day % 10 === 2 && day !== 12) suffix = 'nd';
        else if (day % 10 === 3 && day !== 13) suffix = 'rd';
        return month + ' ' + day + suffix;
      };

      var tooltip_html = (x, y, span1, span2) => {
        var text = (span2 === 0 ? 'No contributions on ' + formatDateOrdinal(span1) + '.' : span2 + ' contribution' + (span2 > 1 ? 's' : '') + ' on ' + formatDateOrdinal(span1) + '.');
        var html = '';
        html += '<div class="gitmessage" style="top:' + y + 'px;left:' + x + 'px;position: fixed;z-index:9999"><div class="angle-wrapper" style="display:block;"><span>' + text + '</span></div></div>';
        return html;
      };

      var github_canvas_box = () => {
        var html = '<div id="gitcalendarcanvasbox"><canvas id="gitcanvas" style="animation: none;"></canvas></div>';
        return html;
      };

      var github_info_box = (user, color) => {
        var html = '';
        html += '<div id="git_tooltip_container"></div><div class="contrib-footer clearfix mt-1 mx-3 px-3 pb-1"><div class="float-left text-gray">Datasource <a href="https://github.com/' + user + '" target="blank">@' + user + '</a></div><div class="contrib-legend text-gray">Less <ul class="legend">';
        html += '<li style="background-color:' + color[0] + '"></li>';
        html += '<li style="background-color:' + color[1] + '"></li>';
        html += '<li style="background-color:' + color[2] + '"></li>';
        html += '<li style="background-color:' + color[3] + '"></li>';
        html += '<li style="background-color:' + color[4] + '"></li>';
        html += '</ul>More </div></div>';
        return html;
      };

      var github_main_box = (monthchange, git_data, user, color, total, thisweekdatacore, weekdatacore, oneyearbeforeday, thisday, aweekago, amonthago) => {
        var html = '';
        var canvasbox = github_canvas_box();
        var infobox = github_info_box(user, color);
        var style = github_main_style();
        html += '<div class="position-relative"><div class="border py-2 graph-before-activity-overview"><div class="js-gitcalendar-graph mx-md-2 mx-3 d-flex flex-column flex-items-end flex-xl-items-center pt-1 is-graph-loading graph-canvas gitcalendar-graph height-full text-center">' + canvasbox + '</div>' + infobox + '</div></div>';
        html += '<div class="contrib-details" style="display:flex;width:100%"><div class="contrib-column contrib-column-first table-column"><span class="text-muted">Committed in the last year</span><span class="contrib-number">' + total + '</span><span class="text-muted">' + oneyearbeforeday + '&nbsp;-&nbsp;' + thisday + '</span></div><div class="contrib-column table-column"><span class="text-muted">Committed in the last month</span><span class="contrib-number">' + thisweekdatacore + '</span><span class="text-muted">' + amonthago + '&nbsp;-&nbsp;' + thisday + '</span></div><div class="contrib-column table-column"><span class="text-muted">Committed in the last week</span><span class="contrib-number">' + weekdatacore + '</span><span class="text-muted">' + aweekago + '&nbsp;-&nbsp;' + thisday + '</span></div></div>' + style;
        return html;
      };

      var github_main_style = () => {
        var style = '<style>#github_container{text-align:center;margin:0 auto;width:100%;display:flex;display:-webkit-flex;justify-content:center;align-items:center;flex-wrap:wrap;}.gitcalendar-graph text.wday,.gitcalendar-graph text.month{font-size:11px;fill:#767676;}.contrib-legend{text-align:right;padding:0 14px 10px 0;display:inline-block;float:right;}.contrib-legend .legend{display:inline-block;list-style:none;margin:0 5px;position:relative;bottom:-1px;padding:0;}.contrib-legend .legend li{display:inline-block;width:10px;height:10px;border-radius:3px;margin:0 2px;}.text-small{font-size:12px;color:#767676;}.gitcalendar-graph{padding:15px 0 0;text-align:center;overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%;}.gitcalendar-graph::-webkit-scrollbar{width:5px;height:5px;}.gitcalendar-graph::-webkit-scrollbar-track{background-color:transparent;}.gitcalendar-graph::-webkit-scrollbar-thumb{background-color:#ccc;border-radius:10px;}@media screen and (min-width:1024px){.gitcalendar-graph::-webkit-scrollbar{display:none;}}.contrib-column{text-align:center;border-left:1px solid #ddd;border-top:1px solid #ddd;font-size:11px;}.contrib-column-first{border-left:0;}.table-column{padding:10px;display:table-cell;flex:1;vertical-align:top;}.contrib-number{font-weight:300;line-height:1.3em;font-size:24px;display:block;}.gitcalendar img.spinner{width:70px;margin-top:50px;min-height:70px;}.monospace{text-align:center;color:#000;font-family:monospace;}.monospace a{color:#1D75AB;text-decoration:none;}.contrib-footer{font-size:11px;padding:0 10px 12px;text-align:left;width:100%;box-sizing:border-box;height:26px;}.left.text-muted{float:left;margin-left:9px;color:#767676;}.left.text-muted a{color:#4078c0;text-decoration:none;}.left.text-muted a:hover,.monospace a:hover{text-decoration:underline;}h2.f4.text-normal.mb-3{display:none;}.float-left.text-gray{float:left;}#user-activity-overview{display:none;}.day-tooltip{white-space:nowrap;position:absolute;z-index:99999;padding:10px;font-size:12px;color:#959da5;text-align:center;background:rgba(0,0,0,.85);border-radius:3px;display:none;pointer-events:none;}.day-tooltip strong{color:#dfe2e5;}.day-tooltip.is-visible{display:block;}.day-tooltip:after{position:absolute;bottom:-10px;left:50%;width:5px;height:5px;box-sizing:border-box;margin:0 0 0 -5px;content:" ";border:5px solid transparent;border-top-color:rgba(0,0,0,.85);}.position-relative{width:100%;}#gitcalendarcanvasbox{min-width:750px;margin:0 auto;width:100%;}#gitcanvas{display:block;}@media screen and (max-width:650px){.contrib-column{flex:none;width:33.3%;padding:5px;font-size:10px;}.contrib-number{font-size:16px;}.contrib-details{flex-wrap:wrap;}.js-gitcalendar-graph{padding:10px 0 0;}}.angle-wrapper{z-index:9999;display:inline-block;max-width:none;padding:2px 6px;background:rgba(0,0,0,0.8);border-radius:8px;text-align:center;color:white;white-space:nowrap;word-break:normal;}.angle-box{position:fixed;padding:10px;}.angle-wrapper span{display:inline-block;}.angle-wrapper:before{display:none;}</style>';
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
    github_canlendar(git_user, git_githubapiurl, git_color);
  }
}