import zipfile, re
zf = zipfile.ZipFile("E:\\opencodetest\\Time Table view\\timetable.xlsx")
xml = zf.read("xl/worksheets/sheet1.xml").decode("utf8", "replace")
rows = re.findall(r'<row[^>]*\br="(\d+)"[^>]*>(.*?)</row>', xml, re.S)
for r, inner in rows:
    if int(r) == 7:
        print("ROW 7 XML:")
        print(inner[:3000])
        break
