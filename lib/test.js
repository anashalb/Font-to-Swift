generateContentDict: function(data) {

			console.log("Parsing file...");

			var contentDict = {};
			var obj = css.parse(data);

			var stylesheet = obj.stylesheet;
			var rules = stylesheet.rules;

			for (var index in rules) {

				var rule = rules[index];
				var content = undefined;
				var declarations = rule.declarations;

				for (var decIndex in declarations) {

					var declaration = declarations[decIndex];

					if (declaration.property == 'content') {

						if (declaration.value.match(/^"\\.*"$/g)) {

							content = declaration.value.replace(/\\/, "\\u{").replace(/"$/, "}\"");
						} else if (declaration.value.match(/"."/g)) {
							content = declaration.value;
						}
					}
				}

				if (content) {
					var selectors = rule.selectors;

					for (var selIndex in selectors) {

						var selector = this.createSafeVariable(selectors[selIndex]);
						contentDict[selector] = content;
					}
				}
			}

			return contentDict;
		},