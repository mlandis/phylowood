#!/usr/bin/ruby

# This script takes an MCC NEWICK tree and converts to Phylowood friendly format

# Walk through file and save NEWICK tree 
tree = ""
filestr = ""
writestr = ""
filename = ARGV[0]
infile = File.new(filename, "r")
infile.each { |line|
	if m = line.match(/^tree[^(]+(.+)/)
		tree = m[1]
	end
    filestr += line
}
infile.close
linetokens = filestr.split("\n")


# Create settings block

settingstokens = ['Begin phylowood;',
"\tdrawtype\tpie",
"\tmodeltype\tphylogeography",
"\tareatype\tdiscrete",
"\tmaptype\tclean",
"\tpieslicestyle\tfull",
"\tpiefillstyle\toutwards",
"\ttimestart\t0.0",
"\ttimeunit\tyr",
"\tmarkerradius\t200.0",
"\tminareaval\t0.0",
"\tdescription\tDiscrete phylogeography (default settings)",
"End;"]


# Create taxa block
# ... already exists, do nothing


# Create geo block

# Find count and ordering of geographic states
geotokens = []
g = Array.new
tree.scan(/location="([A-Za-z\_\-]+)"/) {|s|
    g.push(s[0])
	loc = "\t\t" + s[0]
	geotokens.push(loc)
}

# Reduce and sort
g = g.uniq.sort
geotokens = geotokens.uniq.sort

# Complete geo block
for i in 0..(geotokens.length-1)
    geotokens[i] = geotokens[i] + " [LATITUDE] [LONGITUDE]"
end
for i in 0..(geotokens.length-2)
    geotokens[i] = geotokens[i] + ","
end
geotokens.insert(0, 'Begin geo;')
geotokens.insert(1, "\tDimensions ngeo=" + g.length.to_s + ";")
geotokens.insert(2, "\tCoords")
geotokens.insert(-1, "\t;")
geotokens.insert(-1, 'End;')



# Create tree block
# ... labels already exist
# ... convert location='' tag to area_pp=[]

# Go through tree and print location distributions for each node
# In MCC tree, find "location" attribute
areastr = []
tree.scan(/\[\&([A-Z0-9a-z\,\.\-\{\}\_\%\=\"]+)\]/) {|s|

    labels = s[0]

    # create location,value map
	h = Hash.new
	g.each { |loc|
		h[loc] = 0
	}
	labels.scan(/location="([A-Za-z\_\-]+)"/) {|s|
		loc = s[0]
		h[loc] = 1
	}	
		
	# Sort locations for output
	areastr.push("[&area_pp={" + h.sort.map{ |k,v| "#{v.inspect}"}.join(",") + "}]")
    #print areastr
	
}

# Go through tree and strip out annotations
treestr = tree.gsub(/\[\&[A-Z0-9a-z\,\.\-\{\}\_\%\=\"]+\]/) {|s|}

# Go through treestr and insert new areastr
skipcolon = false
areastridx = 0
treetokens = treestr.split('')
for i in 0..(treetokens.length + areastr.length)

    #print i.to_s + "\n"
    if treetokens[i] == ':' and skipcolon == false

        # skip next colon (indexing)
        skipcolon = true

        # insert before colon
        treetokens.insert(i,areastr[areastridx])

        # get next areastridx
        areastridx += 1

    elsif treetokens[i] == ':' and skipcolon == true
        skipcolon = false
    end

end

# add root state (maybe phylogeography has no root??)
treetokens.insert(-2,areastr[-1]+":1.0");


for i in 0..settingstokens.length
    linetokens.insert(1+i,settingstokens[i]) 
end

for i in 0..geotokens.length
    linetokens.insert(settingstokens.length + i + 1, geotokens[i])
end

linetokens[-2] = "tree TREE1 = "
for i in 0..treetokens.length
    if treetokens[i] != nil
        linetokens[-2] += treetokens[i]
    end
end
linetokens[-2] += "\n"

puts linetokens
