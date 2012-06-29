#!/usr/bin/ruby

# This script takes an MCC NEWICK tree and converts to Phylowood friendly format

# Walk through file and save NEWICK tree 
tree = ""
filename = ARGV[0]
infile = File.new(filename, "r")
infile.each { |line|
	if m = line.match(/^tree[^(]+(.+)/)
		tree = m[1]
	end
}
infile.close

# Find basis for numbering
ids = []
tree.scan(/[\(\,](\d+)\[/) {|s|
	ids.push(Integer(s[0]))
}
id = ids.max

# Add numbers to internal nodes
tree.gsub!(/\)\[/) {|s| 
	id += 1
	")" + id.to_s + "["
}

# Go through tree and print location distributions for each node
puts "#STATES"
tree.scan(/(\d+)\[\&([A-Z0-9a-z\,\.\-\{\}\_\%\=]+)\]/) {|s|
	id = s[0]
	labels = s[1]
	print id
	h = Hash.new
	labels.scan(/AC(\d+)_R=([A-Za-z0-9\.\-]+)/) {|s|
		loc = Integer(s[0])
		value = Float(s[1])
		h[loc] = value
	}	
	
	# Normalize each node's distribution to sum to 1 (input sums to length of branch leading to node)
#	total = 0
#	h.each { |loc, value| 
#		total += value
#	}

	# Find highest state is posterior and set to 1, set other states to 0
	max = h.values.max
	
	# Sort locations for output
	h.sort.map { |loc, value| 
#		print ' %.4f' % (value / total)
		if value < max
			value = 0
		else
			value = 1
		end
		print ' %.1f' % value
	}
	print "\n"
}
print "\n"

# Go through tree and strip out annotations
puts "#TREE"
puts tree.gsub(/\[\&[A-Z0-9a-z\,\.\-\{\}\_\%\=]+\]/) {|s| }
print "\n"