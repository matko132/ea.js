/**
 * Copyright 2014 Martin Vyšňovský (martinvysnovsky@gmail.com)
 */

'use strict';

/**
 * Evolutionary algorithm constructor.
 *
 * @param  array     variables        Variables for algorithm.
 * @param  array     interval         Interval of values that variables cam make.
 * @param  string    number_coding    Type of numbers that can be used. ('INT', 'REAL')
 * @param  function  fitnessFunction  Fitness function.
 * @param  object    options          More options.
 */
function EvolutionaryAlgorithm(variables, interval, number_coding, fitnessFunction, options)
{
	// store variable names
	this.variables = [];
	if(Object.prototype.toString.call(variables) === '[object Array]')
	{
		this.variables = this.variables.concat(variables);
	}
	else
		this.variables.push(variables);

	// check interval
	if(Object.prototype.toString.call(interval) !== '[object Array]' || interval.length != 2)
		throw new Error('Interval must be array with min and max value.');

	// store interval
	this.interval = interval;

	// store number coding
	this.number_coding = number_coding.toUpperCase() || 'INT';

	// check fitness function
	if(Object.prototype.toString.call(fitnessFunction) !== '[object Function]')
		throw new Error('Fitness function must be valid function.');

	// store fitness function
	this.fitnessFunction = fitnessFunction;

	// store if individual have varibale length
	this.variable_individual_length = (options && options.variableIndividualLength) || false;
}

EvolutionaryAlgorithm.prototype = {
	constructor: EvolutionaryAlgorithm,

	/**
	 * Initialize population from individuals.
	 *
	 * @param   int     n       Number of individuals.
	 * @param   string  method  Name of methot to use. Supported values: random
	 *
	 * @return  array           Population.
	 */
	initializePopulation: function(n, method)
	{
		// defaults
		n = n || 0;

		var population = new EvolutionaryAlgorithmPopulation(this);

		if(n > 0)
		{
			var generateIndividualFunction;

			if(Object.prototype.toString.call(method) === '[object Function]')
				generateIndividualFunction = method;
			else
			{
				method = method || 'random';

				switch(method)
				{
					default:
					case 'random':
						var interval = this.interval;

						if(this.number_coding == 'INT')
							generateIndividualFunction = function() { return Math.round((Math.random() * (interval[1] - interval[0])) + interval[0]); };
						else
							generateIndividualFunction = function() { return (Math.random() * (interval[1] - interval[0])) + interval[0]; };
				}
			}

			var fitnessFunction = this.fitnessFunction;
			var variable_individual_length = this.variable_individual_length;
			var max_individual_length = 100;
		
			while(population.count < n)
			{
				var variables = (variable_individual_length) ? Array.apply(null, new Array(Math.floor(Math.random() * max_individual_length) + 1)).map(function (_, i) { return i; }) : this.variables;
				var individual = new EvolutionaryAlgorithmIndividual(variables, generateIndividualFunction, fitnessFunction);

				population.push(individual);
			}
		}

		return population;
	}
};

/**
 * Individiual for evolutionary algorithm.
 *
 * @param  array     variables         Array of variable names.
 * @param  function  generateFunction  Function that generates individual value.
 * @param  function  fitnessFunction   Function that computes fitness.
 */
function EvolutionaryAlgorithmIndividual(variables, generateFunction, fitnessFunction)
{
	this.variables = {};

	if(variables)
	{
		for(var v=0, len=variables.length; v<len; v++)
		{
			var variable = variables[v];
			this.variables[variable] = generateFunction(this, variable, v);
		}
	}

	this.fitness = fitnessFunction(this);
}

EvolutionaryAlgorithmIndividual.prototype = {
	constructor: EvolutionaryAlgorithmIndividual,

	toString: function()
	{
		var variables = this.variables;

		var ret = [];

		for(var p in variables)
		{
			if(this.hasOwnProperty(p))
				ret.push(p + ': ' + variables[p]);
		}

		ret.push('fitness: ' + this.fitness);

		return ret.join(', ');
	},

	toArray: function()
	{
		var variables = this.variables;

		var ret = [];

		for(var p in variables)
		{
			ret.push(variables[p]);
		}

		return ret;
	}

};

/**
 * Population of individuals.
 *
 * @param  array  algorithm  Algorithm that sreates this population.
 */
var EvolutionaryAlgorithmPopulation = (function()
{
	var Constructor = function(algorithm)
	{
		if(!(algorithm instanceof EvolutionaryAlgorithm))
			throw new Error('First argument must be algorithm that creates this population.');
		
		this.algorithm = algorithm;
		this.individuals = [];
	};

	/**
	 * Get n random individuals in population.
	 *
	 * @param   array  individuals  Individuals in population.
	 * @param   int    n            Number of individuals.
	 *
	 * @return  array     Array of individuals.
	 */
	function getRandomParents(individuals, n)
	{
		var parents            = new Array(n);
		var individuals_length = individuals.length;

		for(var i=0; i<n; i++)
		{
			var index = Math.floor(Math.random() * individuals_length);

			parents[i] = individuals[index];
		}

		return parents;
	}

	/**
	 * Get n best individuals in population.
	 *
	 * @param   array   individuals  Individuals in population.
	 * @param   int     n            Number of individuals.
	 *
	 * @return  array     Array of best individuals.
	 */
	function getBestParents(individuals, n)
	{
		// make copy of array
		individuals = individuals.slice(0);

		individuals.sort(function(a, b) {
			return b.fitness - a.fitness;
		});

		return individuals.slice(0, n);
	}

	/**
	 * Get n individuals from population using roulette method.
	 *
	 * @param   array   individuals   Individuals in population.
	 * @param   string  method        Method to use.
	 * @param   int     n             Number of individuals.
	 * @param   bool    shuffleOrder  Shuffle order of individuals. This is used only for univerzal method.
	 *
	 * @return  array                 Array of individuals.
	 */
	function getParentsFromRoulette(individuals, method, n, shuffleOrder)
	{
		var fitnessValues = individuals.slice(0).map(function(individual)
		{
			return Math.max(0, individual.fitness);
		});
		var parents       = new Array(n);
		var i             = 0; // parent counter
		var rouletteSize  = 0;
		var replacement   = function() { };

		switch(method)
		{
			default:
			case 'with_replacement':
			case 'without_replacement':
				// compute size of roulette
				rouletteSize = individuals.reduce(function(a, b)
				{
					return {fitness: a.fitness + Math.max(0, b.fitness)};
				}, {fitness: 0}).fitness;

				if(rouletteSize === 0)
					return [];
				break;
			case 'remainder_with_replacement':
			case 'remainder_without_replacement':
				individuals.forEach(function(individual)
				{
					// get only whole part of fitness
					var wholePart = Math.floor(Math.max(0, individual.fitness));

					for(var j=0; j<wholePart; j++, i++)
						parents[i] = individual;
				});

				// compute size of roulette only from decimal part of fitness
				rouletteSize = individuals.reduce(function(a, b)
				{
					return {fitness: a.fitness + Math.max(0, b.fitness) % 1};
				}, {fitness: 0}).fitness;

				if(rouletteSize === 0)
					return parents;

				fitnessValues = fitnessValues.map(function(fitness)
				{
					return (Math.max(0, fitness) % 1);
				});
				break;
			case 'univerzal':
				shuffleOrder = shuffleOrder || false;
				var keys     = Object.keys(individuals);

				if(shuffleOrder)
				{
					// randomly shuffle order of individuals
					for(var a=0, len=keys.length; a<len; a++)
					{
						var b = a + Math.round(Math.random() * (len - a - 1));
						var temp = keys[a];
						keys[a] = keys[b];
						keys[b] = temp;
					}
				}

				// compute size of roulette
				rouletteSize = individuals.reduce(function(a, b)
				{
					return {fitness: a.fitness + Math.max(0, b.fitness)};
				}, {fitness: 0}).fitness;

				if(rouletteSize === 0)
					return [];

				var pointerStep = rouletteSize / n;

				// compute start position
				var roulette_position = Math.random() * pointerStep;

				var f = 0;
				var j = 0;

				// select n parents
				for(i; i<n; i++)
				{
					// find parent that is at computed position in roulette
					while(f < roulette_position)
						f += Math.max(0, fitnessValues[keys[j++]]);
					
					parents[i] = individuals[keys[j-1]];

					roulette_position += pointerStep;
				}

				return parents;
		}

		if(method == 'without_replacement' || method == 'remainder_without_replacement')
		{
			replacement = function(j)
			{
				rouletteSize--;
				fitnessValues[j] = Math.max(0, fitnessValues[j]-1);
			};
		}

		// select n parents
		for(i; i<n; i++)
		{
			// twist roulette
			roulette_position = Math.random() * rouletteSize;

			// find parent that is at computed position in roulette
			f = 0;
			j = 0;
			while(f < roulette_position)
				f += fitnessValues[j++];
			
			parents[i] = individuals[j-1];

			// call replacement function
			replacement(j);
		}

		return parents;
	}

	Constructor.prototype = {
		/**
		 * Count individuals in population.
		 *
		 * @return  int
		 */
		get count()
		{
			return this.individuals.length;
		},

		/**
		 * Insert individual to population.
		 *
		 * @param   object  individual
		 *
		 * @return  void
		 */
		push: function(individual)
		{
			if(!(individual instanceof EvolutionaryAlgorithmIndividual))
				throw new Error('Population must consists only from EvolutionaryAlgorithmIndividual objects.');

			this.individuals.push(individual);
		},

		/**
		 * Check if population has given individual.
		 *
		 * @param   object   individual
		 *
		 * @return  boolean
		 */
		hasIndividual: function(individual)
		{
			return (this.individuals.indexOf(individual) != -1);
		},

		/**
		 * Get n best individuals in population.
		 *
		 * @param   string  method   Method to use.
		 * @param   int     n        Number of individuals.
		 * @param   object  options  Some other settings for methods.
		 *
		 * @return  array      Array of best individuals.
		 */
		getParents: function(method, n, options)
		{
			switch(method)
			{
				case 'best':
					return getBestParents(this.individuals, n);
				case 'roulette':
					var rouletteMethod = options.rouletteMethod || 'with_replacement';
					return getParentsFromRoulette(this.individuals, rouletteMethod, n, options.shuffleOrder);
				case 'random':
					return getRandomParents(this.individuals, n);
				default:

			}

			return [];
		},

		/**
		 * Method to get groups of parents, that goes to crossover.
		 *
		 * @param   array   parents     Selected parents.
		 * @param   int     n           Number of groups.
		 * @param   string  method      Method to use.
		 * @param   int     group_size  Number of parents in group.
		 *
		 * @return  array               Groups.
		 */
		getParentGroups: function(parents, n, method, group_size)
		{
			if(!parents || parents.length === 0)
				return [];

			n = n || 0;

			if(n == 0)
				return [];

			group_size = group_size || 2;

			var parents_length = parents.length;
			var groups         = [];

			switch(method)
			{
				default:
				case 'random':
					for(var i=0; i<n; i++)
					{
						var p1 = parents[Math.floor(Math.random() * parents_length)];
						var p2 = parents[Math.floor(Math.random() * parents_length)];

						groups.push([p1, p2]);
					}
					break;
			}

			return groups;
		},

		/**
		 * Method to make crossover.
		 *
		 * @param   array   groups   Array of groups.
		 * @param   string  method   Method to use.
		 * @param   object  options  Options.
		 *
		 * @return  array            Created children.
		 */
		crossover: function(groups, method, options)
		{
			if(!groups || groups.length === 0)
				return [];

			options = options || {};

			var groups_length = groups.length;
			var children      = [];

			var fitnessFunction = this.algorithm.fitnessFunction;
			var crossover_function;

			switch(method)
			{
				default:
				case 'one_point':
					var different_points = options.different_points || false;

					crossover_function = function(items)
					{
						var size = items.length;

						if(size == 0)
							return [];

						if(size == 1)
							return items[0];

						var probability = options.probability || 1;

						if(probability != 1 && Math.random() > probability)
							return items;

						// get variables from parents
						var p1 = items[0].toArray();
						var p2 = items[1].toArray();

						if(p1.length < 2 || p2.length < 2)
							return [];

						// compute cut indexes
						var index1 = Math.round(Math.random() * p1.length - 2) + 1;
						var index2 = (different_points) ? Math.round(Math.random() * p2.length - 2) + 1 : index1;

						// crossover
						var v1 = p1.slice(0, index1).concat(p2.slice(index2));
						var v2 = p2.slice(0, index2).concat(p1.slice(index1));

						var ret = [];

						// create new childrens
						var v1_keys = Object.keys(v1);
						if(v1_keys.length > 0)
						{
							var ch1 = new EvolutionaryAlgorithmIndividual(v1_keys, function(individual, v) { return v1[v]; }, fitnessFunction);
							ret.push(ch1);
						}

						var v2_keys = Object.keys(v2);
						if(v2_keys.length > 0)
						{
							var ch2 = new EvolutionaryAlgorithmIndividual(v2_keys, function(individual, v) { return v2[v]; }, fitnessFunction);
							ret.push(ch2);
						}

						return ret;
					}
					break;
				case 'mean':
					crossover_function = function(items)
					{
						var size = items.length;

						if(size == 0)
							return [];

						var probability = options.probability || 1;

						if(probability < 1 && Math.random() > probability)
							return items[0];

						if(size == 1)
							return items[0];

						// get variables from parents
						var p1 = items[0].toArray();
						var p2 = items[1].toArray();

						var ch = [];

						var min_individual_length = Math.min(p1.length, p2.length);

						for(var i=0; i<min_individual_length; i++)
							ch[i] = (p1[i] + p2[i]) / 2;

						var ch_keys = Object.keys(ch);

						return new EvolutionaryAlgorithmIndividual(ch_keys, function(individual, v) { return ch[v]; }, fitnessFunction);
					}
					break;
			}

			// cross all groups and create children
			for(var i=0; i<groups_length; i++)
			{
				children = children.concat(crossover_function(groups[i]));
			}

			return children;
		},

		/**
		 * Method to meke mutation
		 *
		 * @param   array   parents  Individuals to mutate.
		 * @param   string  method   Method to use.
		 * @param   object  options  Options.
		 *
		 * @return  array            Mutated individuals
		 */
		mutation: function(parents, method, options)
		{
			if(!parents || parents.length === 0)
				return [];

			options = options || {};

			var algorithm = this.algorithm;
			var interval  = algorithm.interval;

			var parents_length = parents.length;
			var children       = new Array(parents_length);

			var getVariables;	// function to get new variables for children
			var generateFunction;
			var fitnessFunction = algorithm.fitnessFunction;

			var f;
			var current_individual_data;

			switch(method)
			{
				case 'extremal_mutation':
					if(this.algorithm.number_coding == 'INT')
						f = function() { return Math.round((Math.random() > 0.5) ? interval[1] : interval[0]); };
					else
						f = function() { return (Math.random() > 0.5) ? interval[1] : interval[0]; };
					// fall through
				default:
				case 'uniform_mutation':
					var max_percent_change  = options.max_percent_change || 1;

					if(f == undefined)
					{
						var range      = interval[1] - interval[0];
						var max_change = range * max_percent_change;

						if(this.algorithm.number_coding == 'INT')
							f = function(cur_value) {
								var change = (Math.random() * max_change * 2) - max_change; // from -max_change to +max_change
								
								return Math.max(interval[0], Math.min(interval[1], Math.round(cur_value + change))); // stay in interval
							};
						else
							f = function(cur_value) {
								var change = (Math.random() * max_change * 2) - max_change; // from -max_change to +max_change
								
								return Math.max(interval[0], Math.min(interval[1], cur_value + change)); // stay in interval
							};
					}

					var probability = options.probability || 0.1;

					getVariables = function(i)
					{
						current_individual_data = parents[i].variables;
						var variable_keys = Object.keys(current_individual_data);

						return variable_keys;
					};

					generateFunction = function(individual, variable, k)
					{
						var cur_value = current_individual_data[variable];

						return (Math.random() <= probability) ? f(cur_value) : cur_value;
					};
					break;
				case 'shrink_mutation':
					var max_shrink_size  = options.max_shrink_size || 5;

					getVariables = function(i)
					{
						var parent = parents[i];

						var variable_keys    = Object.keys(parent.variables);
						var variables_length = variable_keys.length;
						var start_pos        = Math.round(Math.random() * variables_length);
						var shrink_size      = Math.round(Math.random() * max_shrink_size);

						current_individual_data = parent.toArray();
						current_individual_data.splice(start_pos, shrink_size);

						return Array.apply(null, new Array(current_individual_data.length)).map(function (_, i) { return i; });
					};

					generateFunction = function(individual, variable)
					{
						return current_individual_data[variable];
					};
					break;
				case 'growth_mutation':
					var max_growth_size = options.max_growth_size || 5;

					getVariables = function(i)
					{
						var parent = parents[i];

						var variable_keys    = Object.keys(parent.variables);
						var variables_length = variable_keys.length;
						var pos              = Math.round(Math.random() * variables_length); // position to insert
						var growth_size      = Math.round(Math.random() * max_growth_size);

						var variables = Array.apply(null, new Array(growth_size)).map(function () {
							return Math.round((Math.random() * (interval[1] - interval[0])) + interval[0]);
						});

						current_individual_data = parent.toArray();
						variables.unshift(0);
						variables.unshift(pos);
						Array.prototype.splice.apply(current_individual_data, variables);

						return Array.apply(null, new Array(current_individual_data.length)).map(function (_, i) {return i;});
					};

					generateFunction = function(individual, variable)
					{
						return current_individual_data[variable];
					};
					break;
				case 'swap_mutation':
					var max_swap_size = options.max_swap_size || 5;

					getVariables = function(i)
					{
						var parent = parents[i];

						var variable_keys    = Object.keys(parent.variables);
						var variables_length = variable_keys.length;
						var swap_size        = Math.round(Math.random() * max_swap_size);
						var max_index        = variables_length - swap_size;
						var pos1             = Math.round(Math.random() * max_index);
						var pos2             = Math.min(Math.round(Math.random() * (max_index - pos1)) + pos1, max_index);

						current_individual_data = parent.toArray();
						var data2 = current_individual_data.slice(pos2, pos2 + swap_size);
						data2.unshift(swap_size);
						data2.unshift(pos1);
						var data1 = Array.prototype.splice.apply(current_individual_data, data2);
						data1.unshift(swap_size);
						data1.unshift(pos2);
						Array.prototype.splice.apply(current_individual_data, data1);

						return variable_keys;
					};

					generateFunction = function(individual, variable)
					{
						return current_individual_data[variable];
					};
					break;
				case 'replace_mutation':
					var max_replace_size = options.max_replace_size || 5;
					var max_insert_size  = options.max_insert_size || 5;

					max_replace_size++;
					max_insert_size++;

					getVariables = function(i)
					{
						var parent = parents[i];

						var variable_keys    = Object.keys(parent.variables);
						var variables_length = variable_keys.length;
						var start_pos        = Math.floor(Math.random() * variables_length);
						var replace_size     = Math.floor(Math.random() * max_replace_size);
						var insert_size      = Math.floor(Math.random() * max_insert_size);

						var variables = Array.apply(null, new Array(insert_size)).map(function () {
							return Math.round((Math.random() * (interval[1] - interval[0])) + interval[0]);
						});

						current_individual_data = parent.toArray();
						variables.unshift(replace_size);
						variables.unshift(start_pos);
						Array.prototype.splice.apply(current_individual_data, variables);

						return Array.apply(null, new Array(current_individual_data.length)).map(function (_, i) {return i;});
					};

					generateFunction = function(individual, variable)
					{
						return current_individual_data[variable];
					};
					break;
			}

			// mutate all parents and create children
			for(var i=0; i<parents_length; i++)
			{
				var variables = getVariables(i);

				if(variables.length > 0)
					children[i] = new EvolutionaryAlgorithmIndividual(variables, generateFunction, fitnessFunction);
				else
					i--;
			}

			return children;
		},

		/**
		 * Method to replace individuals in curent population with new ones
		 *
		 * @param   array   parents   Selected parents from curent population.
		 * @param   array   children  Generated children from genetic operators.
		 * @param   string  method    Method to use.
		 * @param   object  options   Options for some methods.
		 *
		 * @return  void
		 */
		replacement: function(parents, children, method, options)
		{
			var individuals_length = this.individuals.length;
			var newGenerationSize;

			switch(method)
			{
				case 'comma_strategy':
					newGenerationSize = (options && options.newGenerationSize) || individuals_length;

					// sort children by fitness
					children.sort(function(a, b) {
						return b.fitness - a.fitness;
					});

					this.individuals = children.slice(0, newGenerationSize);
					break;
				case 'separate_competition':
					var generationGap = (options && options.generationGap) || 0;
					var num_parents = individuals_length - generationGap;

					// sort parents by fitness
					parents.sort(function(a, b) {
						return b.fitness - a.fitness;
					});

					parents = parents.slice(0, num_parents);

					// sort children by fitness
					children.sort(function(a, b) {
						return b.fitness - a.fitness;
					});

					this.individuals = parents.concat(children.slice(0, generationGap));
					break;
				case 'plus_strategy':
					newGenerationSize = (options && options.newGenerationSize) || individuals_length;
					var plus = parents.concat(children);

					// sort parents and children by fitness
					plus.sort(function(a, b) {
						return b.fitness - a.fitness;
					});

					this.individuals = plus.slice(0, newGenerationSize);
					break;
				default:
				case 'generational':
					this.individuals = children;
			}
		}
	};

	return Constructor;
}());