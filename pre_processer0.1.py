# -*- coding:utf-8 -*-

import time
import os
import sys
import urllib.request
import nltk
from nltk.corpus import gutenberg
from nltk.tokenize import word_tokenize
from nltk.tag import pos_tag
from konlpy.tag import Kkma
from konlpy.tag import Hannanum
from konlpy.tag import Twitter
import shutil
import codecs
import re
import ply.lex as lex
import ply.yacc as yacc
from konlpy.tag import Komoran
from konlpy.utils import pprint
from operator import itemgetter

#따옴표 제거
def rule1(data):
    p_succ = re.compile(r'"|”|“')
    return p_succ.sub('',data)

#문장단위로 나누기
def rule2(data):
    p_succ = re.compile(r'[!.?]+\s*')
    return p_succ.sub('.\n',data)

#띄어쓰기 제거
def rule3(data):
    p_succ = re.compile(r'\s+')
    return p_succ.sub(' ', data)

#엔터제거
def rule4(data):
    p_succ = re.compile(r'\n')
    return p_succ.sub('', data)

def initial(name):
    # shutil.copy(name+'.txt','./data/'+name+'_original.txt')
    fin = codecs.open('./uploads/'+name+'.txt', 'r', 'utf-8')
    temp=fin.read()
    temp=rule4(temp)
    temp=rule3(temp)
    temp=rule1(temp)
    temp=rule2(temp)
    fin.close()
    fout = open('./data/'+name+'/'+name+'.txt', 'w', encoding='utf-8')
    fout.write(temp)
    fout.close()


# ------------------------------------------------------
file_name=sys.argv[1]
language=sys.argv[2]
key_range=100
key_dic={}
banned_list=[]
banned_list=['’','”','“','‘']



#twitter noun version
def kr_process(file_name, key_range):
    global key_dic
    name = './data/'+ file_name+'/'+file_name + '.txt'
    fin = codecs.open(name, 'r', 'utf-8')
    twit=Twitter()
    # for i in range(0,10):

    while True:
        temp = fin.readline()
        if not temp: break
        tagged_list=twit.pos(temp)
        for i in tagged_list:
            if (i[1] == 'Noun' and len(i[0])>1):
                if (i[0] in key_dic):
                    key_dic[i[0]]+=1
                else:
                    key_dic[i[0]]=1
    fin.close()

# #kkma NNG version
# def kr_process2(file_name, key_range):
#     global key_dic
#     key_dic={}
#     name = file_name + '.txt'
#     fin = codecs.open(name, 'r', 'utf-8')
#     twit=Kkma()
#     # for i in range(0,10):
#
#     while True:
#         temp = fin.readline()
#         if not temp: break
#         tagged_list=twit.pos(temp)
#         for i in tagged_list:
#             if (i[1] == 'NNG' and len(i[0])>1):
#                 if (i[0] in key_dic):
#                     key_dic[i[0]]+=1
#                 else:
#                     key_dic[i[0]]=1
#     fin.close()

def en_process(file_name, key_range):
    global key_dic
    global banned_list
    name ='./data/'+ file_name+'/'+file_name + '.txt'
    fin = codecs.open(name, 'r', 'utf-8')

    while True:
        temp = fin.readline()
        if not temp: break
        tagged_list=pos_tag(word_tokenize(temp))
        for i in tagged_list:
            if (i[1] == 'NNP' and i[0] not in banned_list and len(i[0])>2):
                if (i[0] in key_dic):
                    key_dic[i[0]]+=1
                else:
                    key_dic[i[0]]=1
    fin.close()

def print_key(name):
    global key_dic
    fout_value = open('./data/'+name+'/'+name+'_value_key.txt', 'w', encoding='utf-8')
    fout = open('./data/'+name+'/'+name+'_key0.txt', 'w', encoding='utf-8')
    key_dic=sorted(key_dic.items(), key=lambda k : k[1], reverse=True)
    num=1
    for i in key_dic:
        if(i[1]>1):
            fout_value.write(i[0] + ' ' + str(i[1]) + '\n')
            fout.write(str(num)+'\t'+i[0]+' #\n')
            num+=1

    fout.close()

if not os.path.isdir('./data/'):
    os.mkdir('./data/')
if not os.path.isdir('./data/'+file_name+'/'):
    os.mkdir('./data/'+file_name+'/')

initial(file_name)

if(language=='kr'):
    kr_process(file_name, key_range)
else:
    en_process(file_name, key_range)

print_key(file_name)
