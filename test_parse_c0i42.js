import * as cheerio from 'cheerio';

const url = 'https://www.cwa.gov.tw/V8/C/W/Observe/MOD/24hr/C0I42.html';

fetch(url)
  .then(res => res.text())
  .then(html => {
    console.log('HTML length:', html.length);
    const $ = cheerio.load('<table><tbody>' + html + '</tbody></table>');
    const list = [];
    
    $('tr').each((idx, tr) => {
      const headersMap = {};
      $(tr).find('td, th').each((cellIdx, cell) => {
        const h = $(cell).attr('headers');
        const text = $(cell).find('span.is-active').length > 0 
          ? $(cell).find('span.is-active').text().trim() 
          : $(cell).text().trim();
        headersMap[h || 'time'] = text.replace(/\s+/g, ' ');
      });

      const timeStr = headersMap['time'] || '';
      const tempStr = headersMap['temp'] || '';
      const humStr = headersMap['hum'] || '';
      const rainStr = headersMap['rain'] || '';

      const temperature = tempStr && tempStr !== '-' && tempStr !== '無觀測' ? parseFloat(tempStr) : null;
      const humidity = humStr && humStr !== '-' && humStr !== '無觀測' ? parseFloat(humStr) : null;
      const precipitation = rainStr && rainStr !== '-' && rainStr !== '無觀測' ? parseFloat(rainStr) : null;

      let dateTimeStr = '';
      try {
        const currentYear = new Date().getFullYear();
        const match = timeStr.match(/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
        if (match) {
          const [_, month, day, hours, minutes] = match;
          dateTimeStr = `${currentYear}-${month}-${day}T${hours}:${minutes}:00`;
        } else {
          dateTimeStr = new Date().toISOString();
        }
      } catch (e) {
        dateTimeStr = new Date().toISOString();
      }

      if (timeStr) {
        list.push({
          time: timeStr,
          dateTime: dateTimeStr,
          temperature,
          humidity,
          precipitation,
          headersMap
        });
      }
    });

    console.log('Parsed list count:', list.length);
    if (list.length > 0) {
      console.log('First 5 items:', list.slice(0, 5));
    }
  })
  .catch(err => console.error(err));
