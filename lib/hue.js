let huejay = require('huejay')
let client

function hue (str, args, callback) {
  var command = JSON.parse(str)
  if (command.func_name === 'discover') {
    huejay.discover()
    .then(bridges => {
      if (callback) {
        callback(null, bridges)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'client.create') {
    client = new huejay.Client(args[0])
  } else if (command.func_name === 'users.create') {
    let user = new client.users.User
    client.users.create(user)
    .then(user => {
      if (callback) {
        callback(null, user)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'users.get') {
    client.users.get()
    .then(user => {
      if (callback) {
        callback(null, user)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'users.getAll') {
    client.users.getAll()
    .then(users => {
      if (callback) {
        callback(null, users)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'bridge.ping') {
    client.bridge.ping()
    .then(() => {
      if (callback) {
        callback(null)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error)
      }
    })
  } else if (command.func_name === 'lights.scan') {
    client.lights.scan()
    .then(() => {
      if (callback) {
        callback(null)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error)
      }
    })
  } else if (command.func_name === 'lights.getNew') {
    client.lights.getNew()
    .then(lights => {
      if (callback) {
        callback(null, lights)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'lights.getAll') {
    client.lights.getAll()
    .then(lights => {
      if (callback) {
        callback(null, lights)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'lights.getById') {
    client.lights.getById(args[0])
    .then(light => {
      if (callback) {
        callback(null, light)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'lights.save') {
    client.lights.save(args[0])
    .then(light => {
      if (callback) {
        callback(null, light)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'lights.onAll') {
    client.lights.getAll()
    .then(lights => {
      for (let light of lights) {
        light.on = true
      }
      for (let light of lights) {
        client.lights.save(light)
      }
      if (callback) {
        callback(null, lights)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'lights.offAll') {
    client.lights.getAll()
    .then(lights => {
      for (let light of lights) {
        light.on = false
      }
      for (let light of lights) {
        client.lights.save(light)
      }
      if (callback) {
        callback(null, lights)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'lights.onById') {
    client.lights.getById(args[0])
    .then(light => {
      light.on = true
      return client.lights.save(light)
    })
    .then(light => {
      if (callback) {
        callback(null, light)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'lights.offById') {
    client.lights.getById(args[0])
    .then(light => {
      light.on = false
      return client.lights.save(light)
    })
    .then(light => {
      if (callback) {
        callback(null, light)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'lights.changeBrightnessById') {
    client.lights.getById(args[0])
    .then(light => {
      light.brightness = args[1]
      return client.lights.save(light)
    })
    .then(light => {
      if (callback) {
        callback(null, light)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'lights.changeBrightnessAll') {
    client.lights.getAll()
    .then(lights => {
      for (let light of lights) {
        light.brightness = args[0]
      }
      for (let light of lights) {
        client.lights.save(light)
      }
      if (callback) {
        callback(null, lights)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'lights.changeColorById') {
    client.lights.getById(args[0])
    .then(light => {
      light.xy = args[1]
      return client.lights.save(light)
    })
    .then(light => {
      if (callback) {
        callback(null, light)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  } else if (command.func_name === 'lights.changeColorAll') {
    client.lights.getAll()
    .then(lights => {
      for (let light of lights) {
        light.xy = args[0]
      }
      for (let light of lights) {
        client.lights.save(light)
      }
      if (callback) {
        callback(null, lights)
      }
    })
    .catch(error => {
      if (callback) {
        callback(error, null)
      }
    })
  }
}

module.exports = hue
