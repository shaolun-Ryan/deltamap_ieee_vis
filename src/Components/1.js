let promise = new Promise(function(resolve, reject){
    console.log(1)
    resolve(123)
})

promise.then((e)=>{
    console.log(e)
    return 4
})
    .then((f)=>{
        console.log(f)
    })

