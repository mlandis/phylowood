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

# Find count and ordering of geographic states
g = Array.new
puts '#GEO'
tree.scan(/location="([A-Za-z\_\-]+)"/) {|s|
	loc = s[0]
	g.push(loc)
}

# Reduce and sort
g = g.uniq.sort
puts g
puts 

# Go through tree and print location distributions for each node
# In MCC tree, find "location" attribute
puts "#STATES"
tree.scan(/(\d+)\[\&([A-Z0-9a-z\,\.\-\{\}\_\%\=\"]+)\]/) {|s|
	id = s[0]
	labels = s[1]
	print id
	
	h = Hash.new
	g.each { |loc|
		h[loc] = 0
	}
	
	labels.scan(/location="([A-Za-z\_\-]+)"/) {|s|
		loc = s[0]
		h[loc] = 1
	}	
		
	# Sort locations for output
	h.sort.map { |loc, value| 
		print ' %.1f' % value
	}
	print "\n"
	
}
print "\n"

# Go through tree and strip out annotations
puts "#TREE"
puts tree.gsub(/\[\&[A-Z0-9a-z\,\.\-\{\}\_\%\=\"]+\]/) {|s| }
print "\n"