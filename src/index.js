import 'whatwg-fetch' // Polyfill for fetch
import * as Urlon from 'urlon';

class BigWaffleReader {
  init (options) {
    const defaults = {
      dataset: 'systema_globalis',
      service: 'http://bigwaffle.gapminder.org'
    }
    this.dataset = options.dataset || defaults.dataset
    this.service = options.service || defaults.service
    this.version = options.version
  }

  getAsset (filePath) {
    const asset = filePath.replace(/^assets\//, '') // some datasets still include the root path in asset names 
    const url = `${this.service}/${this.dataset}${this.version ? `/${this.version}` : ''}/assets/${asset}`
    return fetch(url, { credentials: 'same-origin', redirect: "follow" })
      .then(response => {
        if (response.ok) {
          const contentType = response.headers.get("Content-Type")
          if (/application\/json/.test(contentType)) {
            return response.json()
              .then(data => data)
          } else {
            return response.blob() // in case of an image or so ?
              .then(data => data)
          }
        } else {
          return response.text()
            .then(txt => {
              const err = new Error(response.text() || `DDF Service responded with ${response.status}`)
              err.code = `HTTP_${response.status}`
              return err
            })
        }
      })
      .catch(error => {
        console.error(error)
        return error
      })
  }
  
  read (query, parsers) {
    const url = `${this.service}/${this.dataset}${this.version ? `/${this.version}` : ''}?${this._queryAsParams(query)}`
    return fetch(url, { credentials: 'same-origin', redirect: "follow" })
      .then(response => {
        if (response.ok) {
          /*
           * Return an array of objects
          */
          return response.json()
            .then(data => {
              if (data.version) {
                this.version = data.version
              }
              const header = data.header
              return (data.rows || []).map(row => row.reduce((obj, value, headerIdx) => {
                const field = header[headerIdx]
                const parser = parsers[field]
                obj[field] = parser ? parser(value) : value
                return obj
              }, {}))
            })
        } else {
          return response.text()
            .then(txt => {
              const err = new Error(response.text() || `DDF Service responded with ${response.status}`)
              err.code = `HTTP_${response.status}`
              return err
            })
        }
      })
      .catch(error => {
        console.error(error)
        return error
      })
  }

  _queryAsParams (query) {
    //TODO: Add some basic validation ??
    return Urlon.stringify(query) // encodeURIComponent(JSON.stringify(query))
  }
}

export function getReader() {
  /*
   * Return an object that exposes the Reader interface.
   *
   * The Vizabi "class extension" code requires that we return 
   * an object with the public methods of the BigWaffleReader class
   * as ownProperties
   *
   */
  const reader = {}
  Object.getOwnPropertyNames(BigWaffleReader.prototype).forEach(method => {
    if (method !== 'constructor') {
      reader[method] = BigWaffleReader.prototype[method].bind(reader)
    }
  })
  return reader
}
