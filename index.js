function parseExpression(program) {
  program = skipSpace(program);
  let match, expr;
  if (match = /^"([^"]*)"/.exec(program)) {
    expr = {type: "value", value: match[1]};
  } else if (match = /^\d+\b/.exec(program)) {
    expr = {type: "value", value: Number(match[0])};
  } else if (match = /^[^\s(),#"]+/.exec(program)) {
    expr = {type: "word", name: match[0]};
  } else {
    console.log("Unexpected syntax: " + program);
  }
  return parseApply(expr, program.slice(match[0].length));
}

const prompt = require("prompt-sync")({ sigint: true });
function skipSpace(string) {
  let first = string.search(/\S/);
  if (first == -1) return "";
  return string.slice(first);
}

function parseApply(expr, program) {
  program = skipSpace(program);
  if (program[0] != "(") {
    return {expr: expr, rest: program};
  }

  program = skipSpace(program.slice(1));
  expr = {type: "apply", operator: expr, args: []};
  while (program[0] != ")") {
    let arg = parseExpression(program);
    expr.args.push(arg.expr);
    program = skipSpace(arg.rest);
    if (program[0] == "," || program[0]==";") {
      program = skipSpace(program.slice(1));
    } else if (program[0] != ")") {
      console.log("Expected ',' or ')'");
    }
  }
  return parseApply(expr, program.slice(1));
}

function parse(program) {
  let {expr, rest} = parseExpression(program);
  if (skipSpace(rest).length > 0) {
    console.log("Unexpected text after program");
  }
  return expr;
}


const specialForms = Object.create(null);

function evaluate(expr, scope) {
  if (expr.type == "value") {
    return expr.value;
  } else if (expr.type == "word") {
    if (expr.name in scope) {
      return scope[expr.name];
    } else {
      console.log(
        `Undefined binding: ${expr.name}`);
    }
  } else if (expr.type == "apply") {
    let {operator, args} = expr;
    if (operator.type == "word" &&
        operator.name in specialForms) {
      return specialForms[operator.name](expr.args, scope);
    } else {
      let op = evaluate(operator, scope);
      if (typeof op == "function") {
        return op(...args.map(arg => evaluate(arg, scope)));
      } else {
        console.log("Applying a non-function.");
      }
    }
  }
}

specialForms.onlyIf = (args, scope) => {
  if (args.length != 3) {
    if(args[1] in specialForms){
      console.log("e.e")
      if(evaluate(args[0], scope) !==true){
        return evaluate(args[1], scope)
      } 
    }
  } else if (evaluate(args[0], scope) !== false) {
    return evaluate(args[1], scope);
  } else {
    return evaluate(args[2], scope);
  }
};

specialForms.while = (args, scope) => {
  if (args.length != 2) {
    console.log("Wrong number of args to while");
  }
  while (evaluate(args[0], scope) !== false) {
    evaluate(args[1], scope);
  }

  // Since undefined does not exist in Egg, we return false,
  // for lack of a meaningful result.
  return false;
};

specialForms.run = (args, scope) => {
  let value = false;
  for (let arg of args) {
    value = evaluate(arg, scope);
  }
  return value;
};

specialForms.dictionaries = () => {
  ls=[]
  for(const i in specialForms){
    ls.push(i)
  }
  return ls
}

specialForms.scope = (args, scope) => {
  console.log(scope)
}

specialForms.def = (args, scope) => {
  if (args.length != 2 || args[0].type != "word") {
    console.log("Incorrect use of define");
  }
  let value = evaluate(args[1], scope);
  specialForms[args[0].name]= (args, scope) => {
    return value
  }
  i=args[0].name
  specialForms[`${i}.set`] = (argsy, scope) => {
    let value = evaluate(argsy[0], scope);
    specialForms[i]= (args, scope) => {
      return value
    }
    scope[i] = value;
    return value;
  }
  if(typeof(value) == "boolean") valuee="."
  if(valuee.startsWith("[") && valuee.endsWith("]")){
    value.replace("[", "");
    value.replace("]", "")
    value=value.split(",")
    for(let i in value){
      idx=value.indexOf(i)
      i=i.trim()
      value[idx] = i
      if(i.startsWith("[")){
        i.replace("[", " ")
        i.trim()
      }
      if(i.endsWith("]")){
        i.replace("]", " ")
        i.trim()
      }
    value.pop(value.length + 3)
    value.pop(value.length + 2)
    }
  }
  specialForms[`${i}.add`] = (args, scope) => {
    let value = specialForms[i]()
    let toAdd = evaluate(args[0], scope)
    try {
      value=value.toArray()
    } catch {
      console.log()
    }
    try {
      value.push(toAdd)
    } catch (err) {
      console.log(err)
    }
    specialForms[i]= (args, scope) => {
      return value
    }
    specialForms[i] = (args, scope) => {
      return value
    }
    scope[i] = value
    return value
  }
  specialForms[`${i}.Int`] = (argsyy, scope) => {
    let value = specialForms[i]()
    try {
      value=parseInt(value)
    } catch (err) {
      console.log(err)
    }
    console.log(value)
    specialForms[i]= (args, scope) => {
      return value
    }
    specialForms[i] = (args, scope) => {
      return value
    }
    scope[i] = value
    return value
  }
  specialForms[`${i}.Str`] = (argsyyy, scope) => {
    let value = specialForms[i]()
    try {
      value=value.toString()
    } catch (err) {
      console.log(err)
    }
    console.log(value)
    specialForms[i]= (args, scope) => {
      return value
    }
    specialForms[i] = (args, scope) => {
      return value
    }
    scope[i] = value
    return value
  }
  scope[args[0].name] = value;
  return value;
};

const topScope = Object.create(null);

topScope.true = true;
topScope.false = false;
topScope.undefined = null


// → false

for (let op of ["+", "-", "*", "/", "==", "<", ">"]) {
  topScope[op] = Function("a, b", `return a ${op} b;`);
}


specialForms.func = (args, scope) => {
  if (!args.length) {
    throw new SyntaxError("Functions need a body");
  }
  let body = args[args.length - 1];
  let params = args.slice(0, args.length - 1).map(expr => {
    if (expr.type != "word") {
      console.log("Parameter names must be words");
    }
    return expr.name;
  });
  return function () {
    if (arguments.length != params.length) {
      throw new TypeError("Wrong number of arguments");
    }
    let localScope = Object.create(scope);
    for (let i = 0; i < arguments.length; i++) {
      localScope[params[i]] = arguments[i];
    }
    return evaluate(body, localScope);
  };
};

topScope.say = value => {
  console.log(value)
};
topScope.ask = value => {
  return input(value)
}

const variables = Object.create(null)

variables.dad = value => {
  console.log("HEY")
}

function run(program) {
  val=evaluate(parse(program), Object.create(topScope), Object.create(variables));
  return val
}

function input(q){
  variable=prompt(q)
  return variable
}





