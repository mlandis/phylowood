#!/usr/bin/ruby

# This script takes an MCC NEWICK tree and converts to Phylowood friendly format

# Walk through file and save NEWICK tree 
tree = ""
filestr = ""
filename = ARGV[0]
infile = File.new(filename, "r")
infile.each { |line|
	if m = line.match(/^\s*tree[^(]+(.+)/)
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



# Create tree block

# Go through tree and print location distributions for each node
geonames = []
areastr = []
#tree.scan(/([A-Za-z0-9\-\_]+)\[\&([A-Z0-9a-z\,\.\-\{\}\_\%\=]+)\]/) {|s|
tree.scan(/\[\&([A-Z0-9a-z\,\.\-\{\}\_\%\=]+)\]/) {|s|
	labels = s[0]
	
    h = Hash.new
	labels.scan(/AC(\d+)_R=([A-Za-z0-9\.\-]+)/) {|s|
		loc = Integer(s[0])
		value = Float(s[1])
		h[loc] = value
	}	

	# Find highest state is posterior and set to 1, set other states to 0
	max = h.values.max

    # Convert to MCC
    h.each { |k,v| (v == max ? h[k] = 1.0 : h[k] = 0.0) }

    # Sort locations for output
    areastr.push("[&area_pp={" + h.sort.map{ |k,v| "#{v.inspect}"}.join(",") + "}]")

    geonames = h.sort.map{ |k,v| k }
}

# Go through tree and strip out annotations
i = 0
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


# Create geo block

# Find count and ordering of geographic states
geotokens = []

# Complete geo block
for i in 0..(geonames.length)
    geotokens[i] = "\t\t" + geonames[i].to_s
    if i <= geonames.length - 1
        geotokens[i] += ","
    end
end
geotokens.insert(0, 'Begin geo;')
geotokens.insert(1, "\tDimensions ngeo=" + geonames.length.to_s + ";")
geotokens.insert(2, "\tCoords")
geotokens.insert(-1, "\t;")
geotokens.insert(-1, 'End;')



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

outfile = File.open("out.txt","w")
outfile << linetokens.join("\n")
outfile.close
