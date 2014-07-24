#!/usr/bin/ruby

# This script takes an MCC NEWICK tree and converts to Phylowood friendly format
# Looks for location1 for latitude and location2 for longitude
# Each node will have a unique lat/long location

# Walk through file and save NEWICK tree 
tree = ""
filestr = ""
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

print linetokens.to_s + "\n"
# Create settings block

settingstokens = ['Begin phylowood;',
"\tmodeltype\tphylogeography",
"\tareatype\tcontinuous",
"\tmaptype\tclean",
"\ttimestart\t0.0",
"\ttimeunit\tyr",
"\tmarkerradius\t200.0",
"\tminareaval\t0.0",
"\tdescription\tContinuous phylogeography (default settings)",
"End;"]


# Create taxa block
# ... already exists, do nothing


# Go through tree and print location coordinates
lat = []
lon = []
tree.scan(/\[\&([A-Z0-9a-z\,\.\-\{\}\_\%\=]+)\]/) {|s|
	
    labels = s[0]
	labels.scan(/location1=([A-Za-z0-9\.\-]+)/) {|s|
	#labels.scan(/latlong1=([A-Za-z0-9\.\-]+)/) {|s|
		lat.push(s[0])
	}	
	labels.scan(/location2=([A-Za-z0-9\.\-]+)/) {|s|
	#labels.scan(/latlong2=([A-Za-z0-9\.\-]+)/) {|s|
		lon.push(s[0])
	}	
}

print lat.length.to_s + "\n"

# Create geo block
geotokens = []
for i in 0...lat.length
    geotokens[i] = "\t\t" + i.to_s + " " + lat[i] + " " + lon[i] + (i < lat.length-1 ? "," : "")
end
geotokens.insert(0, 'Begin geo;')
geotokens.insert(1, "\tDimensions ngeo=" + lat.length.to_s + ";")
geotokens.insert(2, "\tCoords")
geotokens.insert(-1, "\t;")
geotokens.insert(-1, 'End;')


# create area strings
areastr = []
for i in 0...lat.length
    areastr[i] = "[&area_pp={"
    for j in 0...lat.length
        if j != 0
            areastr[i] += ","
        end
        if i != j
            areastr[i] += "0.0"
        else
            areastr[i] += "1.0"
        end
    end
    areastr[i] += "}]"
end
#areastr=""

# Go through tree and strip out annotations
treestr = tree.gsub(/\[\&[A-Z0-9a-z\,\.\-\{\}\_\%\=]+\]/) {|s|}

# Go through treestr and insert new areastr
skipcolon = false
areastridx = 0
treetokens = treestr.split('')
for i in 0..(treetokens.length + areastr.length)

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
treetokens.insert(-2,areastr[-1]+":1.0")

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

#puts linetokens

