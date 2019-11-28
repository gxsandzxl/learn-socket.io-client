let str = '^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)';

let stack = [], s = '';
for (let i=0; i<str.length; i++) {
  let char = str[i];
  s += char;
  switch(char) {
    case '(':
      stack.push(')');
      break;
    case ')': 
      stack.pop();
      if (stack.length == 0) {
        console.log(s);
        s = '';
        
      }
  }
}