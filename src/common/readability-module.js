// use my "dodgy require" to expose Readability as a js module
import require from "./dodgy-require.js"
const Readability = await require('../3rd-party/Readability.js')
export default Readability