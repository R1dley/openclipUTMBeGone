// Clean YouTube Link — OpenClip Extension
// Strips tracking parameters, playlists, timestamps, and junk from YouTube URLs.

var GENERAL_TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'fbclid', 'gclid', 'gbraid', 'wbraid', 'gad_source'
];

var SINGLE_URL_REGEX = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;
var EXTRACT_URL_REGEX = /(?:https?:\/\/|www\.)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

function getOption(id, defaultValue) {
  var val;
  if (typeof openclip !== 'undefined') {
    if (typeof openclip.option === 'function') {
      val = openclip.option(id);
    } else if (openclip.options && openclip.options[id] !== undefined) {
      val = openclip.options[id];
    }
  }
  if (val === undefined || val === null || val === '') {
    return defaultValue;
  }
  return val;
}

function getBoolOption(id, defaultValue) {
  var val = getOption(id, defaultValue);
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    var lower = val.toLowerCase().trim();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  return Boolean(val);
}

function parseCustomParams(paramStr) {
  if (!paramStr || typeof paramStr !== 'string') return [];
  return paramStr
    .split(',')
    .map(function(p) { return p.trim().toLowerCase(); })
    .filter(function(p) { return p.length > 0; });
}

function parseUrl(rawUrl) {
  var str = rawUrl.trim();
  var match = str.match(/^(?:([a-zA-Z][a-zA-Z0-9+.-]*:)\/\/)?([^/?#]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);
  if (!match) return null;
  return {
    protocol: match[1] || '',
    host: match[2] || '',
    hostname: (match[2] || '').split(':')[0].toLowerCase(),
    pathname: match[3] || '/',
    search: match[4] || '',
    hash: match[5] || ''
  };
}

function parseQueryParams(searchStr) {
  if (!searchStr || searchStr === '?') return [];
  var q = searchStr.indexOf('?') === 0 ? searchStr.slice(1) : searchStr;
  var pairs = q.split('&');
  var list = [];
  for (var i = 0; i < pairs.length; i++) {
    var p = pairs[i];
    if (!p) continue;
    var eq = p.indexOf('=');
    var k = eq !== -1 ? p.slice(0, eq) : p;
    var v = eq !== -1 ? p.slice(eq + 1) : '';
    try {
      var decodedKey = decodeURIComponent(k.replace(/\+/g, ' '));
      list.push({ key: decodedKey, rawKey: k, value: v });
    } catch (e) {
      list.push({ key: k, rawKey: k, value: v });
    }
  }
  return list;
}

function stringifyQueryParams(params) {
  if (!params || params.length === 0) return '';
  var parts = [];
  for (var i = 0; i < params.length; i++) {
    var p = params[i];
    parts.push(p.rawKey + (p.value !== '' ? '=' + p.value : ''));
  }
  return parts.length > 0 ? '?' + parts.join('&') : '';
}

function isYouTubeDomain(hostname) {
  return /(?:^|\.)(?:youtube\.com|youtu\.be)$/i.test(hostname);
}

function shouldRemoveParam(hostname, key, opts) {
  var k = key.toLowerCase();

  // Check custom user-defined parameters
  if (opts.customParams && opts.customParams.indexOf(k) !== -1) {
    return true;
  }

  // General marketing parameters
  if (opts.removeTracking && (GENERAL_TRACKING_PARAMS.indexOf(k) !== -1 || k.indexOf('utm_') === 0)) {
    return true;
  }

  // YouTube Specific parameters
  if (isYouTubeDomain(hostname)) {
    if (opts.removePlaylists && ['list', 'start_radio', 'index'].indexOf(k) !== -1) {
      return true;
    }
    if (opts.removeTimestamps && k === 't') {
      return true;
    }
    if (opts.removeTracking && ['si', 'feature', 'embeds_referring_euri', 'embeds_referring_origin', 'source_ve_path'].indexOf(k) !== -1) {
      return true;
    }
    if (opts.removePlacement && ['pp', 'ab_channel', 'attr_tag'].indexOf(k) !== -1) {
      return true;
    }
  }

  return false;
}

function cleanSingleUrl(rawUrl, options) {
  options = options || {};
  var trimmed = rawUrl.trim();
  var parsed = parseUrl(trimmed);
  if (!parsed) return rawUrl;

  if (!isYouTubeDomain(parsed.hostname)) {
    return rawUrl;
  }

  var rawCustom = options.customParams !== undefined ? options.customParams : getOption('customParams', '');

  var opts = {
    removePlaylists: options.removePlaylists !== undefined ? options.removePlaylists : getBoolOption('removePlaylists', true),
    removeTimestamps: options.removeTimestamps !== undefined ? options.removeTimestamps : getBoolOption('removeTimestamps', true),
    removeTracking: options.removeTracking !== undefined ? options.removeTracking : getBoolOption('removeTracking', true),
    removePlacement: options.removePlacement !== undefined ? options.removePlacement : getBoolOption('removePlacement', true),
    customParams: parseCustomParams(rawCustom)
  };

  var params = parseQueryParams(parsed.search);

  var filteredParams = params.filter(function(p) {
    return !shouldRemoveParam(parsed.hostname, p.key, opts);
  });

  var newSearch = stringifyQueryParams(filteredParams);
  var prefix = parsed.protocol ? parsed.protocol + '//' : '';
  var path = parsed.pathname;

  if (path === '/' && !newSearch && !/\/$/.test(trimmed)) {
    path = '';
  }

  return prefix + parsed.host + path + newSearch;
}

function cleanText(text, options) {
  if (!text) return '';
  var trimmed = text.trim();

  if (SINGLE_URL_REGEX.test(trimmed)) {
    return cleanSingleUrl(trimmed, options);
  }

  return text.replace(EXTRACT_URL_REGEX, function(match) {
    var trailing = '';
    var m = match;
    var punct = /[.,;:!?)]+$/.exec(m);
    if (punct) {
      trailing = punct[0];
      m = m.slice(0, -trailing.length);
    }
    return cleanSingleUrl(m, options) + trailing;
  });
}

function action(selection, options) {
  var text = typeof selection === 'string' ? selection : (selection && selection.text ? selection.text : String(selection || ''));
  if (!text) return '';
  return cleanText(text, options);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = action;
  module.exports.action = action;
  module.exports.cleanSingleUrl = cleanSingleUrl;
  module.exports.cleanText = cleanText;
}
