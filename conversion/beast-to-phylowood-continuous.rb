#!/usr/bin/ruby

# This script takes an MCC NEWICK tree and converts to Phylowood friendly format
# Looks for location1 for latitude and location2 for longitude
# Each node will have a unique lat/long location

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

# Find basis for numbering, this will equal the number of nodes
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
length = id

# Go through tree and print location coordinates
lat = []
long = []
puts "#GEO"
tree.scan(/(\d+)\[\&([A-Z0-9a-z\,\.\-\{\}\_\%\=]+)\]/) {|s|
	id = Integer(s[0])
	labels = s[1]
	labels.scan(/location1=([A-Za-z0-9\.\-]+)/) {|s|
		lat[id] = Float(s[0])
	}	
	labels.scan(/location2=([A-Za-z0-9\.\-]+)/) {|s|
		long[id] = Float(s[0])
	}	
}
for i in 1..length
	print '%.3f' % lat[i]
	print ' %.3f' % long[i]
	print "\n"
end
print "\n"

# Go through tree and print location distributions for each node
puts "#STATES"
tree.scan(/(\d+)\[\&([A-Z0-9a-z\,\.\-\{\}\_\%\=]+)\]/) {|s|
	id = s[0]
	print id
	
	# make matrix and replace id index with 1.0
	states = Array.new(length, 0.0)
	states[Integer(id)] = 1.0
	states = states.drop(1);
	states.each { |value| 
		print ' %.1f' % value
	}
	print "\n"

}
print "\n"

# Go through tree and strip out annotations
puts "#TREE"
puts tree.gsub(/\[\&[A-Z0-9a-z\,\.\-\{\}\_\%\=]+\]/) {|s| }
print "\n"