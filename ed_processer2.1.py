# -*- coding:utf-8 -*-

import time
import os
import sys
import pickle
import urllib.request
from konlpy.tag import Kkma
from konlpy.tag import Hannanum
from konlpy.tag import Twitter
import codecs
import re
import ply.lex as lex
import ply.yacc as yacc
from konlpy.tag import Komoran
from konlpy.utils import pprint
from operator import itemgetter


#python ed_processer2.0.py eastofeden 0 1 20 20
file_name=sys.argv[1]
mode_check=sys.argv[2]
line_start=int(sys.argv[3]) # -1
line_end=int(sys.argv[4])-1   # -1
line_unit=int(sys.argv[5]) #표준편차로 사용
# step=int(sys.argv[6])

line_size=0
indexed_txt='./data/'+file_name+'/'+file_name+'_index.bin'
prg_stat='./data/'+file_name+'/'+file_name+'_stat.txt'
index=[]

def load_index():
    global indexed_txt
    global index
    fin=open(indexed_txt, 'rb')
    index = pickle.load(fin)

def line_indexing():
    global text_file
    global indexed_txt
    global char_set
    global index
    global line_size
    fin = codecs.open(text_file, 'r', 'utf-8')
    temp=fin.read()
    for i in re.finditer('\n',temp):
        num = i.start()
        index.append(num)
    line_size=len(index)
    fin.close()
    fout = open(indexed_txt,'wb')
    pickle.dump(index,fout)
    fout.close()

def line_generate(num):
    global text_file
    global file_name
    global line_unit
    global index
    fin = codecs.open(text_file, 'r', 'utf-8')
    fout = open('./part_text/'+file_name+'/'+file_name + '_part_' + str(num)+'.txt', 'w', encoding='utf-8')
    temp = fin.read()
    for j in range(num,num+line_unit):
        if(j==0):
            print(temp[0:index[0]])
            fout.write(temp[0:index[0]])
        else:
            print(temp[index[j-1]+1:index[j]])
            fout.write(temp[index[j-1]+1:index[j]])

def line_terminate(num):
    global file_name
    os.remove('./part_text/'+file_name+'/'+file_name+'_part_'+str(num)+'.txt')

def graph_terminate(num):
    global file_name
    os.remove('./graph/'+file_name+'/'+file_name+'_graph_'+str(num)+'.js')

def save_stat(num):
    global prg_stat
    global mode_check
    global line_size
    fout = open(prg_stat, 'w', encoding='utf-8')
    if (mode_check == '0'):
        fout.write('%maxl='+str(line_size) + '\n')
    fout.write('%next=' + str(num+1) + '\n')

def load_stat():
    global prg_stat
    global line_size
    fin = codecs.open(prg_stat, 'r', 'utf-8')
    temp = fin.readline()
    line_size = fin.readline()
    line_size = line_size[6:]
    return int(temp[6:])

#----------------------------------------------------------
#텍스트입력
text_file='./data/'+file_name+'/'+file_name+'.txt'
#키워드입력
keyword_file='./data/'+file_name+'/'+file_name+'_key.txt'
#거리계산에 쓰이는 상수 예) 2^-1, 2^-2 에서 2가 상수이다.
score_const=2
#웨이트를 계산할 최대 거리
distance_max=10
#텍스트의 총 문장 수
line_num=0
#텍스트에서 키워드로 인식되는 단어의 총 수
word_num=0
#키워드 종류의 수
keyword_num=0

#v는 vertex, e는 edge
v_min=0
v_max=0
v_avg=0
e_min=0
e_max=0
e_avg=0
v_sum=0
e_sum=0

#키워드 집합
char_set=[]
#키워드들의 텍스트 상 위치
char_vec={}
#키워드 간의 에지들의 모든 웨이트를 딕셔너리로 정리
char_score={}
#정렬을 위한 에지의 튜플형태의 리스트
char_edge=[]

#키워드(버텍스)의 웨이트를 딕셔너리로 정리
vertex_score={}
#정렬을 위한 버텍스의 튜플형태의 리스트
top_vertex=[]

char_mst={}
char_id_only_one={}
start_time=time.time()

#등장인물파일에서 앞에 붙은 태그를 없애는 것
def del_es(data):
    p_succ = re.compile(r'\d|\s|#*')
    return p_succ.sub('',data)

#등장인물파일을 불러온다.
def char_load():
    global char_id_only_one
    global keyword_num
    global char_set
    global keyword_file
    fin = codecs.open(keyword_file, 'r', 'utf-8')
    while True:
        temp = fin.readline()
        if not temp:break
        temp = del_es(temp)
        char_set.append(temp)
        keyword_num=keyword_num+1
        char_id_only_one[temp] = keyword_num
        if(keyword_num>10000):return
    fin.close()

#딕셔너리에 등장인물이 텍스트에서 나온 위치 저장
def add_to_Dic(line_num, data):
    global char_vec
    global word_num
    if(data in char_vec):
        char_vec[data].append(line_num)
    else:
        temp=[]
        temp.append(line_num)
        char_vec[data]=temp
    word_num=word_num+1

#딕셔너리에 등장인물이 텍스트에서 나온 위치 탐색
def line_process(num):
    global file_name
    global line_num
    global char_set
    if(num<0):
        name='./data/'+file_name+'/'+file_name+'.txt'
    else:
        name = './part_text/'+file_name+'/'+file_name+ '_part_' + str(num) + '.txt'
    fin = codecs.open(name, 'r', 'utf-8')
    while True:
        temp = fin.readline()
        if not temp:break
        for char in char_set:
            if(temp.find(char)>0):
                add_to_Dic(line_num,char)
        line_num=line_num+1
    fin.close()

#텍스트 상에서 키워드 간의 거리를 측정하는 함수
def distance(data1, data2):
    start=0
    m_dist=0
    arr_dist=[]
    for i in char_vec[data1]:
        for j in char_vec[data2]:
            temp = abs(i - j)
            if(start==0):
                m_dist=temp
                start=-1
            else:
                if(temp<m_dist):
                    m_dist=temp
        arr_dist.append(m_dist)
        start=0
    return arr_dist

#거리를 기반으로 웨이트를 부여하는 함수
def scoring(data):
    global score_const
    global distance_max
    score=0
    for i in data:
        if(i<=distance_max):
            score+=pow(score_const,-i)
    return score

#에지의 웨이트를 모두더하여 버텍스웨이트를 부여하고 내림차순 정렬한다.
def vertex_scoring():
    global v_max
    global v_min
    global vertex_score
    global top_vertex
    temp=0
    for i in char_score:
        for j in char_score[i]:
            temp=temp+char_score[i][j]
        vertex_score[i]=temp
        top_vertex.append((temp,i))
        temp=0
    top_vertex.sort(key=itemgetter(0), reverse=True)
    v_max=top_vertex[0][0]
    v_min=top_vertex[-1][0]

#에지를 튜플형태로 만들고 오름차순으로 정렬한다.
def score_sorting():
    global char_edge
    global char_score
    global e_max
    global e_min
    for i in char_score:
        for j in char_score[i]:
            if(i==j):continue
            char_edge.append((char_score[i][j],i,j))
    char_edge.sort(key=itemgetter(0),reverse=True)
    e_max=char_edge[0][0]
    e_min=char_edge[-1][0]

#점수를 부여하는 전과정이 포함된 함수
def score_process():
    global char_score
    temp={}
    for i in char_set:
        for j in char_set:
            if((i in char_vec)&(j in char_vec)):
                temp[j]=scoring(distance(i,j))
            else:
                temp[j]=0
        char_score[i]=temp.copy()
        temp.clear()
    vertex_scoring()
    score_sorting()

#에지 웨이트를 일목요연하게 확인할 수 있는 함수(테스트용)
def print_score():
    global char_score
    fout = open('ed_char.txt', 'w', encoding='utf-8')
    for i in char_score:
        fout.write('%CH '+i+'\n')
        for j in char_score[i]:
            fout.write(j+':'+str(char_score[i][j])+' ')
        fout.write('\n\n')

#js형식으로 버텍스와 에지를 정리하여 출력
def make_graph(num):
    global char_id_only_one
    global v_sum
    global e_sum
    global rank
    global char_set
    global char_edge
    global file_name
    node_id={}
    node_size=5
    start=0
    edge_n=0
    if(num<0):
        fout = open('./graph/' + file_name + '/' + file_name + '_graph.js', 'w', encoding='utf-8')
    else:
        fout = open('./graph/' + file_name + '/' + file_name + '_graph_' + str(num) + '.js', 'w', encoding='utf-8')
    fout.write('{"nodes":[\n')
    n=0
    for i in top_vertex:
        if(start!=0):fout.write(',')
        else:start=-1
        node_id[i[1]]=str(n)
        fout.write('{"id":"'+str(char_id_only_one[i[1]])+'","label":"'+i[1]+'","size":'+str(i[0])+'}')
        v_sum=v_sum+i[0]
        n=n+1

    fout.write('],\n"links":[\n')
    start=0
    n=0
    for i in char_edge:
        if(i[0]==0):
            continue
        if (start != 0):fout.write(',')
        else:start = -1
        fout.write('{"id":"' + str(char_id_only_one[i[1]]+char_id_only_one[i[2]]*10000) + '","source":"' + str(char_id_only_one[i[1]]) + '","target":"' + str(char_id_only_one[i[2]]) + '","size":'+ str(i[0]) + '}')
        e_sum=e_sum+i[0]
        n=n+1
    fout.write(']}')


#메타파일(전체정보)생성
def meta_extract():
    global file_name
    global top_vertex
    global char_edge
    global line_num
    global word_num
    global keyword_num
    global v_min
    global v_max
    global e_min
    global e_max
    global v_sum
    global e_sum
    fout = open('./data/'+file_name+'/'+file_name+'_meta.txt', 'w', encoding='utf-8')
    fout.write('%doc_name='+file_name+'.txt'+'\n')
    fout.write('%sentence_number='+str(line_num)+'\n')
    fout.write('%word_number='+str(word_num)+'\n')
    fout.write('%keword_number=' + str(keyword_num) + '\n')
    fout.write('%vertex_min=' + str(v_min) + '\n')
    fout.write('%vertex_max=' + str(v_max) + '\n')
    fout.write('%vertex_avg=' + str(v_sum/len(top_vertex)) + '\n')
    fout.write('%vertex_n=' + str(len(top_vertex)) + '\n')
    fout.write('%edge_min=' + str(e_min) + '\n')
    fout.write('%edge_max=' + str(e_max) + '\n')
    fout.write('%edge_avg=' + str(e_sum/len(char_edge)) + '\n')
    fout.write('%edge_n=' + str(len(char_edge)) + '\n')

def graph_generate(num):
    line_process(num)
    score_process()
    make_graph(num)


if not os.path.isdir('./part_text/'):
    os.mkdir('./part_text/')
if not os.path.isdir('./graph/'):
    os.mkdir('./graph/')
if not os.path.isdir('./part_text/'+file_name + '/'):
    os.mkdir('./part_text/' + file_name + '/')
if not os.path.isdir('./graph/'+file_name+'/'):
    os.mkdir('./graph/'+file_name+'/')

#first touch
if(mode_check=='0'):
    # step==0, 1칸씩 움직임/ step==1, 2칸씩 움직임....... 파라미터 값은 (step-1)로 받아야 함.
    # global step
    line_indexing()
    char_load()
    # +2 -> +1
    for i in range(line_start,line_end-line_unit+2):
        line_generate(i)
        graph_generate(i)
        char_vec.clear()
        vertex_score.clear()
        top_vertex.clear()
        char_edge.clear()
        char_score.clear()
        # added
        # i=i+step
    save_stat(4)
    print(str(line_end-line_unit+2))

elif(mode_check=='1'):
    char_load()
    graph_generate(-1)
    meta_extract()

elif(mode_check=='2'):
    char_load()





end_time=time.time()
print(end_time-start_time)
